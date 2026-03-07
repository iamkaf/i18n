import { requireSession } from "@/lib/session";
import { dbFirst, dbAll, dbRun } from "@/lib/db";
import { computePlaceholderSig } from "@/lib/placeholders";
import { getEnv } from "@/lib/cf";

type SourceStringRow = {
  id: string;
  target_id: string;
  string_key: string;
  source_text: string;
  context: string | null;
  placeholder_sig: string;
  is_active: number;
};

type SuggestionWebhookRow = {
  project_slug: string;
  target_key: string;
  string_key: string;
};

const RATE_LIMIT_WINDOW = "-1 minute";
const RATE_LIMIT_MAX = 5;

function normalizeLocale(value: string): string {
  return value.trim().toLowerCase();
}

async function sendSuggestionWebhook(input: {
  authorName: string;
  locale: string;
  text: string;
  sourceStringId: string;
}) {
  const env = getEnv() as unknown as Record<string, string | undefined>;
  const webhookUrl = (env.DISCORD_SUGGESTIONS_WEBHOOK_URL || env.DISCORD_WEBHOOK_URL || "").trim();
  if (!webhookUrl) return;

  const ref = await dbFirst<SuggestionWebhookRow>(
    `SELECT p.slug as project_slug, t.key as target_key, ss.string_key as string_key
     FROM source_strings ss
     JOIN targets t ON t.id = ss.target_id
     JOIN projects p ON p.id = t.project_id
     WHERE ss.id = ?`,
    [input.sourceStringId],
  );

  if (!ref) return;

  const preview = input.text.length > 160 ? `${input.text.slice(0, 157)}...` : input.text;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: [
          "New translation suggestion",
          `project: ${ref.project_slug}`,
          `target: ${ref.target_key}`,
          `key: ${ref.string_key}`,
          `locale: ${input.locale}`,
          `author: ${input.authorName}`,
          `text: ${preview}`,
        ].join("\n"),
      }),
    });
  } catch {
    // Non-blocking best-effort notification.
  }
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession(req);
  } catch (res) {
    return res as Response;
  }

  let body: { source_string_id?: string; locale?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { source_string_id, locale, text } = body;
  if (!source_string_id || !locale || !text) {
    return Response.json(
      { error: "source_string_id, locale, and text are required" },
      { status: 400 },
    );
  }

  const normalizedLocale = normalizeLocale(locale);
  if (!/^[a-z]{2}_[a-z]{2}$/.test(normalizedLocale)) {
    return Response.json({ error: "locale must match xx_xx" }, { status: 400 });
  }

  const recentCount = await dbFirst<{ total: number }>(
    `SELECT COUNT(*) as total
     FROM suggestions
     WHERE author_discord_id = ?
       AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now', ?)`,
    [session.sub, RATE_LIMIT_WINDOW],
  );
  if ((recentCount?.total ?? 0) >= RATE_LIMIT_MAX) {
    return Response.json(
      {
        error: "Rate limit exceeded",
        details: `You can submit at most ${RATE_LIMIT_MAX} suggestions per minute.`,
      },
      { status: 429 },
    );
  }

  const sourceString = await dbFirst<SourceStringRow>("SELECT * FROM source_strings WHERE id = ?", [
    source_string_id,
  ]);

  if (!sourceString || sourceString.is_active === 0) {
    return Response.json({ error: "Source string not found" }, { status: 404 });
  }

  const sig = computePlaceholderSig(text);
  if (sig !== sourceString.placeholder_sig) {
    return Response.json(
      {
        error: "Placeholder mismatch",
        expected: sourceString.placeholder_sig,
        got: sig,
      },
      { status: 422 },
    );
  }

  const id = crypto.randomUUID();
  await dbRun(
    `INSERT INTO suggestions (id, source_string_id, locale, text, author_discord_id, author_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, source_string_id, normalizedLocale, text, session.sub, session.name],
  );

  void sendSuggestionWebhook({
    authorName: session.name,
    locale: normalizedLocale,
    text,
    sourceStringId: source_string_id,
  });

  return Response.json({ ok: true, id }, { status: 201 });
}

type SuggestionRow = {
  id: string;
  locale: string;
  text: string;
  author_discord_id: string;
  author_name: string | null;
  status: string;
  created_at: string;
  source_string_id: string;
  string_key: string;
  source_text: string;
  context: string | null;
  placeholder_sig: string;
  project_slug: string;
  target_key: string;
  decision_note: string | null;
  decided_at: string | null;
  decided_by_discord_id: string | null;
};

export async function GET(req: Request) {
  let session;
  try {
    session = await requireSession(req);
  } catch (res) {
    return res as Response;
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const locale = url.searchParams.get("locale");
  const project = url.searchParams.get("project");
  const target = url.searchParams.get("target");
  const mine = url.searchParams.get("mine") === "1";
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20),
  );
  const offset = page * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status !== "all") {
    conditions.push("sg.status = ?");
    params.push(status);
  }

  if (locale) {
    conditions.push("sg.locale = ?");
    params.push(locale);
  }
  if (project) {
    conditions.push("p.slug = ?");
    params.push(project);
  }
  if (target) {
    conditions.push("t.key = ?");
    params.push(target);
  }
  if (mine) {
    conditions.push("sg.author_discord_id = ?");
    params.push(session.sub);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const baseQuery = `
    FROM suggestions sg
    JOIN source_strings ss ON ss.id = sg.source_string_id
    JOIN targets t ON t.id = ss.target_id
    JOIN projects p ON p.id = t.project_id
    ${where}
  `;

  const countRow = await dbFirst<{ total: number }>(
    `SELECT COUNT(*) as total ${baseQuery}`,
    params,
  );

  const rows = await dbAll<SuggestionRow>(
    `SELECT
      sg.id, sg.locale, sg.text, sg.author_discord_id, sg.author_name,
      sg.status, sg.created_at, sg.decision_note, sg.decided_at, sg.decided_by_discord_id,
      ss.id as source_string_id, ss.string_key, ss.source_text, ss.context, ss.placeholder_sig,
      p.slug as project_slug, t.key as target_key
    ${baseQuery}
    ORDER BY sg.created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const suggestions = rows.map((r) => ({
    id: r.id,
    locale: r.locale,
    text: r.text,
    author_discord_id: r.author_discord_id,
    author_name: r.author_name,
    status: r.status,
    created_at: r.created_at,
    project_slug: r.project_slug,
    target_key: r.target_key,
    decision_note: r.decision_note,
    decided_at: r.decided_at,
    decided_by_discord_id: r.decided_by_discord_id,
    source_string: {
      id: r.source_string_id,
      key: r.string_key,
      source_text: r.source_text,
      context: r.context,
      placeholder_sig: r.placeholder_sig,
    },
  }));

  return Response.json({ ok: true, total: countRow?.total ?? 0, page, suggestions });
}
