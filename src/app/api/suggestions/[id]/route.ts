import { requireSession } from "@/lib/session";
import { dbFirst, dbRun } from "@/lib/db";
import { computePlaceholderSig } from "@/lib/placeholders";

type SuggestionRow = {
  id: string;
  source_string_id: string;
  locale: string;
  text: string;
  status: "pending" | "accepted" | "rejected";
  author_discord_id: string;
};

type SourceStringRow = {
  id: string;
  placeholder_sig: string;
  is_active: number;
};

function normalizeLocale(value: string): string {
  return value.trim().toLowerCase();
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession(req);
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const current = await dbFirst<SuggestionRow>(
    `SELECT id, source_string_id, locale, text, status, author_discord_id
     FROM suggestions
     WHERE id = ?`,
    [id],
  );
  if (!current) return Response.json({ error: "Suggestion not found" }, { status: 404 });
  if (current.author_discord_id !== session.sub)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  if (current.status !== "pending") {
    return Response.json({ error: "Only pending suggestions can be edited" }, { status: 409 });
  }

  let body: { text?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextText = typeof body.text === "string" ? body.text.trim() : current.text;
  const nextLocale =
    typeof body.locale === "string" && body.locale.trim().length
      ? normalizeLocale(body.locale)
      : current.locale;

  if (!nextText.length) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (!/^[a-z]{2}_[a-z]{2}$/.test(nextLocale)) {
    return Response.json({ error: "locale must match xx_xx" }, { status: 400 });
  }

  const source = await dbFirst<SourceStringRow>(
    `SELECT id, placeholder_sig, is_active
     FROM source_strings
     WHERE id = ?`,
    [current.source_string_id],
  );
  if (!source || source.is_active === 0) {
    return Response.json({ error: "Source string not found" }, { status: 404 });
  }

  const sig = computePlaceholderSig(nextText);
  if (sig !== source.placeholder_sig) {
    return Response.json(
      {
        error: "Placeholder mismatch",
        expected: source.placeholder_sig,
        got: sig,
      },
      { status: 422 },
    );
  }

  await dbRun(
    `UPDATE suggestions
     SET locale = ?, text = ?
     WHERE id = ?`,
    [nextLocale, nextText, id],
  );

  return Response.json({ ok: true, id, locale: nextLocale, text: nextText });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession(req);
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const current = await dbFirst<SuggestionRow>(
    `SELECT id, status, author_discord_id
     FROM suggestions
     WHERE id = ?`,
    [id],
  );
  if (!current) return Response.json({ error: "Suggestion not found" }, { status: 404 });
  if (current.author_discord_id !== session.sub)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  if (current.status !== "pending") {
    return Response.json({ error: "Only pending suggestions can be withdrawn" }, { status: 409 });
  }

  await dbRun(`DELETE FROM suggestions WHERE id = ?`, [id]);
  return Response.json({ ok: true, id });
}
