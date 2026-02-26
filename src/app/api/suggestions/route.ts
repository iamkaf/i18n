import { requireSession } from "@/lib/session";
import { dbFirst, dbAll, dbRun } from "@/lib/db";
import { computePlaceholderSig } from "@/lib/placeholders";

export const runtime = "edge";

type SourceStringRow = {
  id: string;
  target_id: string;
  string_key: string;
  source_text: string;
  context: string | null;
  placeholder_sig: string;
  is_active: number;
};

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
    return Response.json({ error: "source_string_id, locale, and text are required" }, { status: 400 });
  }

  const sourceString = await dbFirst<SourceStringRow>(
    "SELECT * FROM source_strings WHERE id = ?",
    [source_string_id],
  );

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
    [id, source_string_id, locale, text, session.sub, session.name],
  );

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
};

export async function GET(req: Request) {
  try {
    await requireSession(req);
  } catch (res) {
    return res as Response;
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const locale = url.searchParams.get("locale");
  const project = url.searchParams.get("project");
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const offset = page * limit;

  const conditions: string[] = ["sg.status = ?"];
  const params: unknown[] = [status];

  if (locale) {
    conditions.push("sg.locale = ?");
    params.push(locale);
  }
  if (project) {
    conditions.push("p.slug = ?");
    params.push(project);
  }

  const where = conditions.join(" AND ");

  const baseQuery = `
    FROM suggestions sg
    JOIN source_strings ss ON ss.id = sg.source_string_id
    JOIN targets t ON t.id = ss.target_id
    JOIN projects p ON p.id = t.project_id
    WHERE ${where}
  `;

  const countRow = await dbFirst<{ total: number }>(
    `SELECT COUNT(*) as total ${baseQuery}`,
    params,
  );

  const rows = await dbAll<SuggestionRow>(
    `SELECT
      sg.id, sg.locale, sg.text, sg.author_discord_id, sg.author_name,
      sg.status, sg.created_at,
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
