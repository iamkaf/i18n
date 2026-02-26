import { requireTrustedSession } from "@/lib/session";
import { dbFirst, dbRun } from "@/lib/db";

export const runtime = "edge";

type SuggestionRow = {
  id: string;
  status: string;
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
    "SELECT id, status FROM suggestions WHERE id = ?",
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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.decision_note) {
    return Response.json({ error: "decision_note is required for rejections" }, { status: 400 });
  }

  const now = new Date().toISOString();

  await dbRun(
    `UPDATE suggestions
     SET status = 'rejected', decided_by_discord_id = ?, decided_at = ?, decision_note = ?
     WHERE id = ?`,
    [session.sub, now, body.decision_note, id],
  );

  return Response.json({ ok: true });
}
