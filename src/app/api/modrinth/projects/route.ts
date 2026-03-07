import { dbFirst } from "@/lib/db";
import { discoverGithubLocaleFiles, type LocaleFileCandidate } from "@/lib/github-imports";
import {
  extractGitHubRepo,
  fetchModrinthProjectByReference,
  fetchModrinthProjectsByUsername,
  normalizeGitHubRepoUrl,
  type GithubRepoRef,
  type ModrinthProject,
  UpstreamHttpError,
} from "@/lib/modrinth";
import { requireGodSession } from "@/lib/session";

type LocalProject = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  modrinth_project_id: string | null;
  github_repo_url: string | null;
};

async function getLocalProject(project: ModrinthProject): Promise<LocalProject | null> {
  const byId = await dbFirst<LocalProject>(
    `SELECT id, slug, name, visibility, modrinth_project_id, github_repo_url
     FROM projects
     WHERE modrinth_project_id = ?`,
    [project.id],
  );
  if (byId) return byId;

  return dbFirst<LocalProject>(
    `SELECT id, slug, name, visibility, modrinth_project_id, github_repo_url
     FROM projects
     WHERE modrinth_slug = ?`,
    [project.slug],
  );
}

async function annotateProject(project: ModrinthProject) {
  const localProject = await getLocalProject(project);
  const githubRepo = extractGitHubRepo(
    normalizeGitHubRepoUrl(localProject?.github_repo_url) ?? project.source_url,
  );

  let localeFiles: LocaleFileCandidate[] = [];
  let githubWarning: string | null = null;
  let resolvedGithubRepo: GithubRepoRef | null = githubRepo;

  if (githubRepo) {
    try {
      const github = await discoverGithubLocaleFiles(githubRepo);
      resolvedGithubRepo = {
        owner: github.repository.owner,
        name: github.repository.name,
        html_url: github.repository.html_url,
      };
      localeFiles = github.localeFiles;
    } catch (error) {
      if (error instanceof UpstreamHttpError && error.service === "github") {
        githubWarning = "GitHub locale discovery is temporarily unavailable.";
      } else {
        throw error;
      }
    }
  }

  return {
    ...project,
    local_project: localProject,
    github_repo: resolvedGithubRepo,
    locale_files: localeFiles,
    warning: githubWarning,
  };
}

export async function GET(req: Request) {
  try {
    await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim();
  const projectReference = url.searchParams.get("project")?.trim();

  if ((username ? 1 : 0) + (projectReference ? 1 : 0) !== 1) {
    return Response.json({ error: "Provide exactly one of username or project" }, { status: 400 });
  }

  try {
    const mode = username ? "username" : "project";
    const query = username || projectReference || "";
    const projects = username
      ? (await fetchModrinthProjectsByUsername(username)).toSorted(
          (left, right) => right.updated.localeCompare(left.updated),
        )
      : [await fetchModrinthProjectByReference(projectReference as string)];

    if (projects.some((project) => project.project_type !== "mod")) {
      return Response.json({ error: "Only Modrinth mods can be imported" }, { status: 422 });
    }

    const annotated = await Promise.all(projects.map((project) => annotateProject(project)));
    return Response.json({ ok: true, mode, query, projects: annotated });
  } catch (error) {
    if (error instanceof Error && /Modrinth URL/.test(error.message)) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Error && /project is required|username is required/.test(error.message)) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof UpstreamHttpError && error.service === "modrinth") {
      const status = error.status === 404 ? 404 : 502;
      return Response.json({ error: error.message }, { status });
    }
    throw error;
  }
}
