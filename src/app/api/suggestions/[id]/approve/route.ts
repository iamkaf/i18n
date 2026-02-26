import { requireTrustedSession } from "@/lib/session";
import { dbFirst, dbRun } from "@/lib/db";

export const runtime = "edge";

type SuggestionRow = {
  id: string;
  source_string_id: string;
  locale: string;
  text: string;
  status: string;
  author_discord_id: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireTrustedSession(req);
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  const suggestion = await dbFirst<SuggestionRow>(
    "SELECT * FROM suggestions WHERE id = ?",
    [id],
  );

  if (!suggestion) {
    return Response.json({ error: "Suggestion not found" }, { status: 404 });
  }
  if (suggestion.status !== "pending") {
    return Response.json({ error: "Suggestion is not pending" }, { status: 409 });
  }

  let body: { decision_note?: string } = {};
  try {
    body = await req.json();
  } catch {
    // decision_note is optional
  }

  const now = new Date().toISOString();

  await dbRun(
    `UPDATE suggestions
     SET status = 'accepted', decided_by_discord_id = ?, decided_at = ?, decision_note = ?
     WHERE id = ?`,
    [session.sub, now, body.decision_note ?? null, id],
  );

  await dbRun(
    `INSERT INTO translations (id, source_string_id, locale, text, status, approved_by_discord_id, approved_at)
     VALUES (?, ?, ?, ?, 'approved', ?, ?)
     ON CONFLICT(source_string_id, locale) DO UPDATE SET
       text = excluded.text,
       status = 'approved',
       approved_by_discord_id = excluded.approved_by_discord_id,
       approved_at = excluded.approved_at,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    [crypto.randomUUID(), suggestion.source_string_id, suggestion.locale, suggestion.text, session.sub, now],
  );

  return Response.json({ ok: true });
}
