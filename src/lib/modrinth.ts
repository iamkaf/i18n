export type GithubRepoRef = {
  owner: string;
  name: string;
  html_url: string;
};

export type TargetSuggestion = {
  key: string;
  source: "github-dir" | "readme" | "modrinth-game-version";
  confidence: "high" | "medium" | "low";
};

export type ModrinthProject = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  project_type: string;
  updated: string;
  published: string;
  source_url: string | null;
  game_versions: string[];
  loaders: string[];
};

type RawModrinthProject = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  project_type: string;
  updated: string;
  published: string;
  source_url?: string | null;
  game_versions?: string[];
  loaders?: string[];
};

const MODRINTH_HEADERS = {
  "User-Agent": "i18n.kaf.sh (atelier)",
};

export class UpstreamHttpError extends Error {
  service: "modrinth" | "github";
  status: number;

  constructor(service: "modrinth" | "github", status: number, message: string) {
    super(message);
    this.service = service;
    this.status = status;
  }
}

function normalizeModrinthProject(project: RawModrinthProject): ModrinthProject {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    description: project.description,
    icon_url: project.icon_url ?? null,
    project_type: project.project_type,
    updated: project.updated,
    published: project.published,
    source_url: project.source_url ?? null,
    game_versions: Array.isArray(project.game_versions) ? project.game_versions : [],
    loaders: Array.isArray(project.loaders) ? project.loaders : [],
  };
}

async function fetchModrinthJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: MODRINTH_HEADERS });
  if (!response.ok) {
    throw new UpstreamHttpError("modrinth", response.status, `Modrinth error: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchModrinthProjectsByUsername(username: string): Promise<ModrinthProject[]> {
  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error("username is required");
  }

  const projects = await fetchModrinthJson<RawModrinthProject[]>(
    `https://api.modrinth.com/v2/user/${encodeURIComponent(trimmed)}/projects`,
  );
  return projects.filter((project) => project?.project_type === "mod").map(normalizeModrinthProject);
}

function extractProjectSlugFromModrinthUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (!/(^|\.)modrinth\.com$/i.test(url.hostname)) {
    throw new Error("Modrinth URL must point to modrinth.com");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Modrinth project URL is missing a slug");
  }

  const typedPrefixes = new Set(["mod", "plugin", "modpack", "resourcepack", "shader", "datapack", "project"]);
  if (typedPrefixes.has(parts[0])) {
    if (parts.length < 2) {
      throw new Error("Modrinth project URL is missing a slug");
    }
    return parts[1];
  }

  return parts[0];
}

export function normalizeModrinthProjectReference(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("project is required");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const slug = extractProjectSlugFromModrinthUrl(trimmed);
    if (!slug) {
      throw new Error("Invalid Modrinth project URL");
    }
    return slug;
  }

  return trimmed;
}

export async function fetchModrinthProjectByReference(reference: string): Promise<ModrinthProject> {
  const normalized = normalizeModrinthProjectReference(reference);
  const project = await fetchModrinthJson<RawModrinthProject>(
    `https://api.modrinth.com/v2/project/${encodeURIComponent(normalized)}`,
  );
  return normalizeModrinthProject(project);
}

export function extractGitHubRepo(sourceUrl: string | null | undefined): GithubRepoRef | null {
  if (!sourceUrl) return null;

  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }

  if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const name = parts[1].replace(/\.git$/i, "");
  if (!owner || !name) return null;

  return {
    owner,
    name,
    html_url: `https://github.com/${owner}/${name}`,
  };
}

export function normalizeGitHubRepoUrl(sourceUrl: string | null | undefined): string | null {
  const repo = extractGitHubRepo(sourceUrl);
  return repo ? repo.html_url : null;
}
