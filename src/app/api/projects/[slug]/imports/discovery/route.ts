import { dbFirst } from "@/lib/db";
import { discoverGithubLocaleFiles } from "@/lib/github-imports";
import { extractGitHubRepo } from "@/lib/modrinth";
import { UpstreamHttpError } from "@/lib/modrinth";
import { requireGodSession } from "@/lib/session";

type ProjectRow = {
  github_repo_url: string | null;
};

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { slug } = await params;
  const project = await dbFirst<ProjectRow>(
    `SELECT github_repo_url
     FROM projects
     WHERE slug = ?`,
    [slug],
  );

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const repo = extractGitHubRepo(project.github_repo_url);
  if (!repo) {
    return Response.json({
      ok: true,
      github_repo: null,
      locale_files: [],
      warnings: ["GitHub repo URL is not configured for this project."],
    });
  }

  try {
    const discovery = await discoverGithubLocaleFiles(repo);
    return Response.json({
      ok: true,
      github_repo: {
        owner: discovery.repository.owner,
        name: discovery.repository.name,
        html_url: discovery.repository.html_url,
      },
      locale_files: discovery.localeFiles,
      warnings: [],
    });
  } catch (error) {
    if (error instanceof UpstreamHttpError && error.service === "github") {
      const status = error.status === 404 ? 404 : 502;
      return Response.json({ error: error.message }, { status });
    }
    throw error;
  }
}
