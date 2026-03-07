import { dbFirst } from "@/lib/db";
import { fetchGithubFileContent } from "@/lib/github-imports";
import { flattenLocaleObject, importLocaleIntoExistingProject } from "@/lib/project-imports";
import { extractGitHubRepo } from "@/lib/modrinth";
import { UpstreamHttpError } from "@/lib/modrinth";
import { requireGodSession } from "@/lib/session";

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  modrinth_project_id: string | null;
  modrinth_slug: string | null;
  icon_url: string | null;
  github_repo_url: string | null;
};

type ImportBody = {
  locale?: string;
  source?:
    | {
        type?: "github";
        path?: string;
      }
    | {
        type?: "upload";
        file_name?: string;
        content?: string;
      };
};

function decodeBase64Content(input: string): string {
  const binary = atob(input);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { slug } = await params;
  const project = await dbFirst<ProjectRow>(
    `SELECT id, slug, name, visibility, modrinth_project_id, modrinth_slug, icon_url, github_repo_url
     FROM projects
     WHERE slug = ?`,
    [slug],
  );

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as ImportBody;
  const locale = body.locale?.trim().toLowerCase() ?? "";
  if (!/^[a-z]{2}_[a-z]{2}$/.test(locale)) {
    return Response.json({ error: "locale must match xx_xx" }, { status: 422 });
  }

  if (!body.source?.type) {
    return Response.json({ error: "source.type is required" }, { status: 422 });
  }

  let rawContent = "";
  let sourcePath: string | null = null;

  if (body.source.type === "github") {
    const path = "path" in body.source ? body.source.path?.trim() ?? "" : "";
    if (!path) {
      return Response.json({ error: "source.path is required for GitHub imports" }, { status: 422 });
    }
    const repo = extractGitHubRepo(project.github_repo_url);
    if (!repo) {
      return Response.json({ error: "GitHub repo URL is not configured for this project" }, { status: 422 });
    }

    try {
      const file = await fetchGithubFileContent(repo.owner, repo.name, path);
      rawContent = file.encoding === "base64" ? decodeBase64Content(file.content) : file.content;
      sourcePath = path;
    } catch (error) {
      if (error instanceof UpstreamHttpError && error.service === "github") {
        const status = error.status === 404 ? 404 : 502;
        return Response.json({ error: error.message }, { status });
      }
      throw error;
    }
  } else if (body.source.type === "upload") {
    const content = "content" in body.source ? body.source.content ?? "" : "";
    if (!content.trim()) {
      return Response.json({ error: "source.content is required for uploads" }, { status: 422 });
    }
    rawContent = content;
    sourcePath = "file_name" in body.source ? body.source.file_name?.trim() ?? null : null;
  } else {
    return Response.json({ error: "Unsupported source.type" }, { status: 422 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return Response.json({ error: "Import file is not valid JSON" }, { status: 422 });
  }

  let flattened;
  try {
    flattened = flattenLocaleObject(parsed);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Catalog JSON must be an object" },
      { status: 422 },
    );
  }

  const result = await importLocaleIntoExistingProject({
    project,
    locale,
    strings: flattened.strings,
    sourcePath,
    ignoredNonString: flattened.ignoredNonString,
  });

  return Response.json(result);
}
