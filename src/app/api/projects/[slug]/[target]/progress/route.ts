import { dbAll, dbFirst } from "@/lib/db";
import { requireSession } from "@/lib/session";

type ProjectTargetRow = {
  project_slug: string;
  target_key: string;
  visibility: "public" | "private";
  target_id: string;
};

type LocaleCountRow = {
  locale: string;
  approved_count: number;
};

type TotalRow = {
  total_strings: number;
};

async function requireTargetAccess(
  req: Request,
  slug: string,
  target: string,
): Promise<ProjectTargetRow | Response> {
  const row = await dbFirst<ProjectTargetRow>(
    `SELECT
       p.slug as project_slug,
       p.visibility as visibility,
       t.id as target_id,
       t.key as target_key
     FROM projects p
     JOIN targets t ON t.project_id = p.id
     WHERE p.slug = ? AND t.key = ?`,
    [slug, target],
  );

  if (!row) return Response.json({ error: "Project or target not found" }, { status: 404 });
  if (row.visibility === "private") {
    try {
      await requireSession(req);
    } catch (res) {
      return res as Response;
    }
  }

  return row;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; target: string }> },
) {
  const { slug, target } = await params;
  const access = await requireTargetAccess(req, slug, target);
  if (access instanceof Response) return access;

  const totalRow = await dbFirst<TotalRow>(
    `SELECT COUNT(*) as total_strings
     FROM source_strings
     WHERE target_id = ? AND is_active = 1`,
    [access.target_id],
  );
  const totalStrings = totalRow?.total_strings ?? 0;

  const localeRows = await dbAll<LocaleCountRow>(
    `SELECT
       tr.locale as locale,
       COUNT(*) as approved_count
     FROM translations tr
     JOIN source_strings ss ON ss.id = tr.source_string_id
     WHERE ss.target_id = ?
       AND ss.is_active = 1
       AND tr.status = 'approved'
     GROUP BY tr.locale
     ORDER BY tr.locale ASC`,
    [access.target_id],
  );

  const progress = localeRows.map((row) => ({
    locale: row.locale,
    approved_count: row.approved_count,
    total_strings: totalStrings,
    coverage: totalStrings > 0 ? Number((row.approved_count / totalStrings).toFixed(4)) : 0,
  }));

  return Response.json({
    ok: true,
    project: access.project_slug,
    target: access.target_key,
    total_strings: totalStrings,
    progress,
  });
}
