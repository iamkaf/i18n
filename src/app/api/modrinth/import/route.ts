import { dbFirst, dbRun } from "@/lib/db";
import { discoverGithubLocaleFiles, type LocaleFileCandidate } from "@/lib/github-imports";
import {
  extractGitHubRepo,
  fetchModrinthProjectByReference,
  normalizeGitHubRepoUrl,
  UpstreamHttpError,
} from "@/lib/modrinth";
import { requireGodSession } from "@/lib/session";

type ExistingProject = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  modrinth_project_id: string | null;
  github_repo_url: string | null;
};

type ImportBody = {
  source?: {
    id?: string;
    slug?: string;
  };
  project?: {
    slug?: string;
    name?: string;
    visibility?: "public" | "private";
    github_repo_url?: string | null;
  };
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-_]*$/.test(value);
}

export async function POST(req: Request) {
  try {
    await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const body = (await req.json().catch(() => ({}))) as ImportBody;
  const sourceId = body.source?.id?.trim() || "";
  const slug = normalizeSlug(body.project?.slug || "");
  const name = body.project?.name?.trim() || "";
  const visibility = body.project?.visibility || "private";
  const githubRepoUrlInput =
    typeof body.project?.github_repo_url === "string" ? body.project.github_repo_url.trim() : "";
  const githubRepoUrl =
    githubRepoUrlInput === "" ? null : normalizeGitHubRepoUrl(githubRepoUrlInput);

  if (!sourceId) {
    return Response.json({ error: "source.id is required" }, { status: 422 });
  }
  if (!slug || !isValidSlug(slug)) {
    return Response.json({ error: "project.slug must be a lowercase slug" }, { status: 422 });
  }
  if (!name) {
    return Response.json({ error: "project.name is required" }, { status: 422 });
  }
  if (visibility !== "public" && visibility !== "private") {
    return Response.json({ error: "project.visibility must be public or private" }, { status: 422 });
  }
  if (githubRepoUrlInput && !githubRepoUrl) {
    return Response.json({ error: "project.github_repo_url must be a valid GitHub repository URL" }, { status: 422 });
  }

  try {
    const modrinthProject = await fetchModrinthProjectByReference(sourceId);
    if (modrinthProject.project_type !== "mod") {
      return Response.json({ error: "Only Modrinth mods can be imported" }, { status: 422 });
    }

    const existingByModrinth = await dbFirst<ExistingProject>(
      `SELECT id, slug, name, visibility, modrinth_project_id
             , github_repo_url
       FROM projects
       WHERE modrinth_project_id = ?`,
      [modrinthProject.id],
    );
    const existingBySlug = await dbFirst<ExistingProject>(
      `SELECT id, slug, name, visibility, modrinth_project_id, github_repo_url
       FROM projects
       WHERE slug = ?`,
      [slug],
    );

    let targetProject = existingByModrinth;
    let action: "created" | "updated" = "created";

    if (!targetProject && existingBySlug) {
      if (existingBySlug.modrinth_project_id && existingBySlug.modrinth_project_id !== modrinthProject.id) {
        return Response.json(
          { error: "That local slug already belongs to a different linked project. Choose another slug." },
          { status: 409 },
        );
      }
      targetProject = existingBySlug;
      action = "updated";
    } else if (targetProject) {
      if (existingBySlug && existingBySlug.id !== targetProject.id) {
        return Response.json(
          { error: "That local slug already belongs to a different linked project. Choose another slug." },
          { status: 409 },
        );
      }
      action = "updated";
    }

    const now = new Date().toISOString();
    if (targetProject) {
      await dbRun(
        `UPDATE projects
         SET slug = ?, name = ?, visibility = ?, modrinth_project_id = ?, modrinth_slug = ?, icon_url = ?, github_repo_url = ?, updated_at = ?
         WHERE id = ?`,
        [
          slug,
          name,
          visibility,
          modrinthProject.id,
          modrinthProject.slug,
          modrinthProject.icon_url,
          githubRepoUrl,
          now,
          targetProject.id,
        ],
      );
    } else {
      await dbRun(
        `INSERT INTO projects (
           id, slug, name, visibility, default_locale, modrinth_project_id, modrinth_slug, icon_url, github_repo_url, created_at, updated_at
         ) VALUES (?, ?, ?, ?, 'en_us', ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          slug,
          name,
          visibility,
          modrinthProject.id,
          modrinthProject.slug,
          modrinthProject.icon_url,
          githubRepoUrl,
          now,
          now,
        ],
      );
    }

    const saved = await dbFirst<{
      id: string;
      slug: string;
      name: string;
      visibility: "public" | "private";
      modrinth_project_id: string;
      modrinth_slug: string;
      icon_url: string | null;
      github_repo_url: string | null;
      updated_at: string;
    }>(
      `SELECT id, slug, name, visibility, modrinth_project_id, modrinth_slug, icon_url, github_repo_url, updated_at
       FROM projects
       WHERE modrinth_project_id = ?`,
      [modrinthProject.id],
    );

    if (!saved) {
      return Response.json({ error: "Failed to save project" }, { status: 500 });
    }

    const githubRepo = extractGitHubRepo(githubRepoUrl ?? modrinthProject.source_url);
    let localeFiles: LocaleFileCandidate[] = [];
    let warning: string | null = null;

    if (githubRepo) {
      try {
        const github = await discoverGithubLocaleFiles(githubRepo);
        localeFiles = github.localeFiles;
      } catch (error) {
        if (error instanceof UpstreamHttpError && error.service === "github") {
          warning = "GitHub locale discovery is temporarily unavailable.";
        } else {
          throw error;
        }
      }
    }

    return Response.json({
      ok: true,
      action,
      project: saved,
      github_repo: githubRepo,
      locale_files: localeFiles,
      warning,
    });
  } catch (error) {
    if (error instanceof UpstreamHttpError && error.service === "modrinth") {
      const status = error.status === 404 ? 404 : 502;
      return Response.json({ error: error.message }, { status });
    }
    throw error;
  }
}
