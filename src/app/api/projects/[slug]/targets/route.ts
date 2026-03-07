import { dbAll, dbFirst } from "@/lib/db";
import { requireSession } from "@/lib/session";

type ProjectRow = {
  id: string;
  slug: string;
  visibility: "public" | "private";
};

type TargetRow = {
  id: string;
  key: string;
  label: string | null;
  source_revision: string | null;
  source_hash: string | null;
  active_strings: number;
  updated_at: string;
};

async function requireProjectAccess(req: Request, slug: string): Promise<ProjectRow | Response> {
  const project = await dbFirst<ProjectRow>(
    `SELECT id, slug, visibility
     FROM projects
     WHERE slug = ?`,
    [slug],
  );
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  if (project.visibility === "private") {
    try {
      await requireSession(req);
    } catch (res) {
      return res as Response;
    }
  }

  return project;
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await requireProjectAccess(req, slug);
  if (project instanceof Response) return project;

  const rows = await dbAll<TargetRow>(
    `SELECT
       t.id,
       t.key,
       t.label,
       t.source_revision,
       t.source_hash,
       t.updated_at,
       SUM(CASE WHEN ss.is_active = 1 THEN 1 ELSE 0 END) as active_strings
     FROM targets t
     LEFT JOIN source_strings ss ON ss.target_id = t.id
     WHERE t.project_id = ?
     GROUP BY t.id
     ORDER BY t.updated_at DESC, t.key ASC`,
    [project.id],
  );

  return Response.json({
    ok: true,
    project: { slug: project.slug, visibility: project.visibility },
    targets: rows,
  });
}
