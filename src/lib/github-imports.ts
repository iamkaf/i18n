import type { GithubRepoRef } from "@/lib/modrinth";
import { UpstreamHttpError } from "@/lib/modrinth";

type GithubRepositoryResponse = {
  files: string[];
  repository: {
    owner: string;
    name: string;
    html_url: string;
    default_branch: string;
    homepage: string | null;
    readme?: string | null;
  };
};

export type GithubContentResponse = {
  path: string;
  name: string;
  size: number;
  sha: string;
  encoding: string;
  content: string;
  url: string;
  html_url: string;
  download_url: string | null;
};

export type LocaleFileCandidate = {
  locale: string;
  path: string;
  source: "github";
  kind: "source" | "translation";
};

function normalizeLocale(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return /^[a-z]{2}_[a-z]{2}$/.test(normalized) ? normalized : null;
}

export function inferLocaleFromPath(path: string): string | null {
  const fileName = path.split("/").filter(Boolean).at(-1) ?? "";
  if (!fileName.toLowerCase().endsWith(".json")) return null;
  return normalizeLocale(fileName.slice(0, -5));
}

export async function fetchGithubRepository(
  owner: string,
  repo: string,
): Promise<GithubRepositoryResponse> {
  const response = await fetch(
    `https://gh.kaf.sh/api/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  );
  if (!response.ok) {
    throw new UpstreamHttpError("github", response.status, `GitHub cache error: ${response.status}`);
  }
  return (await response.json()) as GithubRepositoryResponse;
}

export async function fetchGithubFileContent(
  owner: string,
  repo: string,
  path: string,
): Promise<GithubContentResponse> {
  const response = await fetch(
    `https://gh.kaf.sh/api/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents?path=${encodeURIComponent(path)}`,
  );
  if (!response.ok) {
    throw new UpstreamHttpError("github", response.status, `GitHub cache error: ${response.status}`);
  }
  return (await response.json()) as GithubContentResponse;
}

export function discoverLocaleFiles(files: string[]): LocaleFileCandidate[] {
  return files
    .map((path) => {
      const locale = inferLocaleFromPath(path);
      if (!locale) return null;
      return {
        locale,
        path,
        source: "github" as const,
        kind: locale === "en_us" ? "source" : "translation",
      };
    })
    .filter((item): item is LocaleFileCandidate => item !== null)
    .toSorted((left, right) => {
      if (left.kind !== right.kind) return left.kind === "source" ? -1 : 1;
      if (left.locale !== right.locale) return left.locale.localeCompare(right.locale);
      return left.path.localeCompare(right.path);
    });
}

export async function discoverGithubLocaleFiles(repo: GithubRepoRef): Promise<{
  repository: {
    owner: string;
    name: string;
    html_url: string;
    default_branch: string;
    homepage: string | null;
  };
  localeFiles: LocaleFileCandidate[];
}> {
  const snapshot = await fetchGithubRepository(repo.owner, repo.name);
  return {
    repository: {
      owner: snapshot.repository.owner,
      name: snapshot.repository.name,
      html_url: snapshot.repository.html_url,
      default_branch: snapshot.repository.default_branch,
      homepage: snapshot.repository.homepage ?? null,
    },
    localeFiles: discoverLocaleFiles(snapshot.files),
  };
}
