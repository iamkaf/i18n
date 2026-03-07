import { dbAll, dbFirst } from "@/lib/db";
import { requireSession } from "@/lib/session";

type ProjectRow = {
  id: string;
  slug: string;
  visibility: "public" | "private";
};

type LocaleCountRow = {
  locale: string;
  approved_count: number;
};

type TotalRow = {
  total_strings: number;
};

async function requireProjectAccess(req: Request, slug: string): Promise<ProjectRow | Response> {
  const project = await dbFirst<ProjectRow>(
    `SELECT id, slug, visibility
     FROM projects
     WHERE slug = ?`,
    [slug],
  );
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.visibility === "private") {
    try {
      await requireSession(req);
    } catch (error) {
      return error as Response;
    }
  }
  return project;
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await requireProjectAccess(req, slug);
  if (access instanceof Response) {
    return access;
  }

  const totalRow = await dbFirst<TotalRow>(
    `SELECT COUNT(*) as total_strings
     FROM source_strings
     WHERE project_id = ? AND is_active = 1`,
    [access.id],
  );
  const totalStrings = totalRow?.total_strings ?? 0;

  const localeRows = await dbAll<LocaleCountRow>(
    `SELECT
       tr.locale as locale,
       COUNT(*) as approved_count
     FROM translations tr
     JOIN source_strings ss ON ss.id = tr.source_string_id
     WHERE ss.project_id = ?
       AND ss.is_active = 1
       AND tr.status = 'approved'
     GROUP BY tr.locale
     ORDER BY tr.locale ASC`,
    [access.id],
  );

  const progress = [
    {
      locale: "en_us",
      approved_count: totalStrings,
      total_strings: totalStrings,
      coverage: totalStrings > 0 ? 1 : 0,
    },
    ...localeRows
      .filter((row) => row.locale !== "en_us")
      .map((row) => ({
        locale: row.locale,
        approved_count: row.approved_count,
        total_strings: totalStrings,
        coverage: totalStrings > 0 ? Number((row.approved_count / totalStrings).toFixed(4)) : 0,
      })),
  ];

  return Response.json({
    ok: true,
    project: access.slug,
    total_strings: totalStrings,
    progress,
  });
}
