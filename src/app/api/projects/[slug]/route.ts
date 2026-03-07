import { dbFirst, dbRun } from "@/lib/db";
import { normalizeGitHubRepoUrl } from "@/lib/modrinth";
import { requireGodSession, requireSession } from "@/lib/session";

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  default_locale: string;
  icon_url: string | null;
  modrinth_project_id: string | null;
  modrinth_slug: string | null;
  github_repo_url: string | null;
  source_string_count: number;
  has_source_catalog: number;
  updated_at: string;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-_]*$/.test(value);
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await dbFirst<ProjectRow>(
    `SELECT
       p.id,
       p.slug,
       p.name,
       p.visibility,
       p.default_locale,
       p.icon_url,
       p.modrinth_project_id,
       p.modrinth_slug,
       p.github_repo_url,
       p.updated_at,
       COUNT(CASE WHEN ss.is_active = 1 THEN 1 END) as source_string_count,
       CASE WHEN COUNT(CASE WHEN ss.is_active = 1 THEN 1 END) > 0 THEN 1 ELSE 0 END as has_source_catalog
     FROM projects
     p
     LEFT JOIN source_strings ss ON ss.project_id = p.id
     WHERE p.slug = ?
     GROUP BY p.id`,
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

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { slug: currentSlug } = await params;
  const current = await dbFirst<{ id: string }>("SELECT id FROM projects WHERE slug = ?", [currentSlug]);
  if (!current) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    name?: string;
    visibility?: "public" | "private";
    github_repo_url?: string | null;
  };

  const nextSlug = normalizeSlug(body.slug || "");
  const nextName = body.name?.trim() || "";
  const nextVisibility = body.visibility;
  const githubRepoUrlInput =
    typeof body.github_repo_url === "string" ? body.github_repo_url.trim() : "";
  const githubRepoUrl =
    githubRepoUrlInput === "" ? null : normalizeGitHubRepoUrl(githubRepoUrlInput);

  if (!nextSlug || !isValidSlug(nextSlug)) {
    return Response.json({ error: "slug must be a lowercase slug" }, { status: 422 });
  }
  if (!nextName) {
    return Response.json({ error: "name is required" }, { status: 422 });
  }
  if (nextVisibility !== "public" && nextVisibility !== "private") {
    return Response.json({ error: "visibility must be public or private" }, { status: 422 });
  }
  if (githubRepoUrlInput && !githubRepoUrl) {
    return Response.json({ error: "github_repo_url must be a valid GitHub repository URL" }, { status: 422 });
  }

  const conflicting = await dbFirst<{ id: string }>(
    "SELECT id FROM projects WHERE slug = ? AND id <> ?",
    [nextSlug, current.id],
  );
  if (conflicting) {
    return Response.json(
      { error: "That slug already belongs to another project. Choose another slug." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  await dbRun(
    `UPDATE projects
     SET slug = ?, name = ?, visibility = ?, github_repo_url = ?, updated_at = ?
     WHERE id = ?`,
    [nextSlug, nextName, nextVisibility, githubRepoUrl, now, current.id],
  );

  const project = await dbFirst<ProjectRow>(
    `SELECT
       p.id,
       p.slug,
       p.name,
       p.visibility,
       p.default_locale,
       p.icon_url,
       p.modrinth_project_id,
       p.modrinth_slug,
       p.github_repo_url,
       p.updated_at,
       COUNT(CASE WHEN ss.is_active = 1 THEN 1 END) as source_string_count,
       CASE WHEN COUNT(CASE WHEN ss.is_active = 1 THEN 1 END) > 0 THEN 1 ELSE 0 END as has_source_catalog
     FROM projects p
     LEFT JOIN source_strings ss ON ss.project_id = p.id
     WHERE p.id = ?
     GROUP BY p.id`,
    [current.id],
  );

  if (!project) {
    return Response.json({ error: "Failed to update project" }, { status: 500 });
  }

  return Response.json({ ok: true, project });
}
