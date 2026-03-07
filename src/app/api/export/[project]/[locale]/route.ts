import { requireTokenScopes } from "@/lib/auth";
import { dbAll, dbFirst } from "@/lib/db";
import { getSession } from "@/lib/session";

type ProjectRow = {
  id: string;
  slug: string;
  visibility: "public" | "private";
};

type ExportRow = {
  string_key: string;
  text: string;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ project: string; locale: string }> },
) {
  const { project, locale: localeParam } = await params;
  const locale = localeParam.trim().toLowerCase();
  if (!/^[a-z]{2}_[a-z]{2}$/.test(locale)) {
    return Response.json({ error: "locale must match xx_xx" }, { status: 400 });
  }

  const row = await dbFirst<ProjectRow>(
    `SELECT id, slug, visibility
     FROM projects
     WHERE slug = ?`,
    [project],
  );
  if (!row) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (row.visibility === "private") {
    const session = await getSession(req);
    if (!session) {
      try {
        await requireTokenScopes(req, ["export:read"]);
      } catch (error) {
        if (error instanceof Response) return error;
        throw error;
      }
    }
  }

  const exportRows = await dbAll<ExportRow>(
    `SELECT
       ss.string_key,
       ${locale === "en_us" ? "ss.source_text" : "COALESCE(tr.text, ss.source_text)"} as text
     FROM source_strings ss
     LEFT JOIN translations tr
       ON tr.source_string_id = ss.id
      AND tr.locale = ?
      AND tr.status = 'approved'
     WHERE ss.project_id = ?
       AND ss.is_active = 1
     ORDER BY ss.string_key ASC`,
    [locale, row.id],
  );

  return Response.json(
    Object.fromEntries(exportRows.map((entry) => [entry.string_key, entry.text])),
  );
}
