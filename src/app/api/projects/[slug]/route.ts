import { dbFirst } from "@/lib/db";
import { requireSession } from "@/lib/session";

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  default_locale: string;
  icon_url: string | null;
  modrinth_slug: string | null;
  updated_at: string;
};

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await dbFirst<ProjectRow>(
    `SELECT id, slug, name, visibility, default_locale, icon_url, modrinth_slug, updated_at
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
    } catch (res) {
      return res as Response;
    }
  }

  return Response.json({ ok: true, project });
}
