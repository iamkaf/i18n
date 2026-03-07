/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signSession } from "@/lib/session";

vi.mock("@/lib/cf", () => ({
  getEnv: () => ({ SESSION_SECRET: "test-secret-1234567890abcdef" }),
}));

const mockDbFirst = vi.fn();
const mockDbAll = vi.fn();
const mockGetDB = vi.fn();
const mockRequireTokenScopes = vi.fn();
const mockImportLocaleIntoExistingProject = vi.fn();
const mockUpsertProjectLocaleCatalog = vi.fn();
const mockDiscoverGithubLocaleFiles = vi.fn();

vi.mock("@/lib/db", () => ({
  dbFirst: (...args: unknown[]) => mockDbFirst(...args),
  dbAll: (...args: unknown[]) => mockDbAll(...args),
  dbRun: vi.fn(),
  getDB: (...args: unknown[]) => mockGetDB(...args),
}));

vi.mock("@/lib/auth", () => ({
  requireTokenScopes: (...args: unknown[]) => mockRequireTokenScopes(...args),
}));

vi.mock("@/lib/project-imports", async () => {
  const actual = await vi.importActual<typeof import("@/lib/project-imports")>("@/lib/project-imports");
  return {
    ...actual,
    importLocaleIntoExistingProject: (...args: unknown[]) => mockImportLocaleIntoExistingProject(...args),
    upsertProjectLocaleCatalog: (...args: unknown[]) => mockUpsertProjectLocaleCatalog(...args),
  };
});

vi.mock("@/lib/github-imports", async () => {
  const actual = await vi.importActual<typeof import("@/lib/github-imports")>("@/lib/github-imports");
  return {
    ...actual,
    discoverGithubLocaleFiles: (...args: unknown[]) => mockDiscoverGithubLocaleFiles(...args),
    fetchGithubFileContent: vi.fn(),
  };
});

const SECRET = "test-secret-1234567890abcdef";
const GOD = { sub: "517599684961894400", name: "Kaf", avatar: null };
const USER = { sub: "123", name: "User", avatar: null };

async function makeSessionRequest(url: string, session: typeof GOD | typeof USER | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (session) {
    const token = await signSession(session, SECRET);
    headers.set("Cookie", `__session=${encodeURIComponent(token)}`);
  }
  return new Request(url, { ...init, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects/[slug]/strings", () => {
  it("returns project-scoped strings with the caller's latest suggestion", async () => {
    const { GET } = await import("@/app/api/projects/[slug]/strings/route");
    mockDbFirst
      .mockResolvedValueOnce({
        id: "p1",
        slug: "demo-mod",
        visibility: "public",
        default_locale: "en_us",
      })
      .mockResolvedValueOnce({ total: 1 });
    mockDbAll.mockResolvedValueOnce([
      {
        id: "ss1",
        string_key: "menu.title",
        source_text: "Hello",
        context: null,
        placeholder_sig: "",
        approved_translation: "Bonjour",
        my_suggestion_id: "s1",
        my_suggestion_locale: "fr_fr",
        my_suggestion_text: "Salut",
        my_suggestion_status: "pending",
        my_suggestion_created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const req = await makeSessionRequest("http://localhost/api/projects/demo-mod/strings?locale=fr_fr&include_mine=1", USER);
    const res = await GET(req, { params: Promise.resolve({ slug: "demo-mod" }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.strings[0].string_key).toBe("menu.title");
    expect(json.strings[0].my_suggestion.text).toBe("Salut");
  });
});

describe("GET /api/projects/[slug]/progress", () => {
  it("returns en_us plus locale coverage without targets", async () => {
    const { GET } = await import("@/app/api/projects/[slug]/progress/route");
    mockDbFirst
      .mockResolvedValueOnce({
        id: "p1",
        slug: "demo-mod",
        visibility: "public",
      })
      .mockResolvedValueOnce({ total_strings: 4 });
    mockDbAll.mockResolvedValueOnce([{ locale: "zh_cn", approved_count: 2 }]);

    const req = new Request("http://localhost/api/projects/demo-mod/progress");
    const res = await GET(req, { params: Promise.resolve({ slug: "demo-mod" }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.progress[0]).toEqual({
      locale: "en_us",
      approved_count: 4,
      total_strings: 4,
      coverage: 1,
    });
    expect(json.progress[1].locale).toBe("zh_cn");
  });
});

describe("GET /api/export/[project]/[locale]", () => {
  it("exports approved translations with English fallback", async () => {
    const { GET } = await import("@/app/api/export/[project]/[locale]/route");
    mockDbFirst.mockResolvedValueOnce({
      id: "p1",
      slug: "demo-mod",
      visibility: "public",
    });
    mockDbAll.mockResolvedValueOnce([
      { string_key: "menu.title", text: "Bonjour" },
      { string_key: "menu.subtitle", text: "Hello again" },
    ]);

    const req = new Request("http://localhost/api/export/demo-mod/fr_fr");
    const res = await GET(req, { params: Promise.resolve({ project: "demo-mod", locale: "fr_fr" }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      "menu.title": "Bonjour",
      "menu.subtitle": "Hello again",
    });
  });
});

describe("GET /api/projects/[slug]/imports/discovery", () => {
  it("returns locale files from the linked GitHub repo", async () => {
    const { GET } = await import("@/app/api/projects/[slug]/imports/discovery/route");
    mockDbFirst
      .mockResolvedValueOnce({
        github_repo_url: "https://github.com/iamkaf/amber",
      });
    mockDiscoverGithubLocaleFiles.mockResolvedValueOnce({
      repository: {
        owner: "iamkaf",
        name: "amber",
        html_url: "https://github.com/iamkaf/amber",
      },
      localeFiles: [
        { locale: "en_us", path: "lang/en_us.json", source: "github", kind: "source" },
        { locale: "zh_cn", path: "lang/zh_cn.json", source: "github", kind: "translation" },
      ],
    });

    const req = await makeSessionRequest("http://localhost/api/projects/amber/imports/discovery", GOD);
    const res = await GET(req, { params: Promise.resolve({ slug: "amber" }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.locale_files).toHaveLength(2);
  });
});

describe("POST /api/projects/[slug]/imports", () => {
  it("imports uploaded en_us JSON into the existing project", async () => {
    const { POST } = await import("@/app/api/projects/[slug]/imports/route");
    mockDbFirst.mockResolvedValueOnce({
      id: "p1",
      slug: "amber",
      name: "Amber",
      visibility: "private",
      modrinth_project_id: null,
      modrinth_slug: null,
      icon_url: null,
      github_repo_url: "https://github.com/iamkaf/amber",
    });
    mockImportLocaleIntoExistingProject.mockResolvedValueOnce({
      ok: true,
      locale: "en_us",
      mode: "source",
      imported: 1,
      updated: 0,
      deactivated: 0,
      ignored_non_string: 0,
      skipped_unmatched: [],
      source_path: "en_us.json",
    });

    const req = await makeSessionRequest("http://localhost/api/projects/amber/imports", GOD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "en_us",
        source: {
          type: "upload",
          file_name: "en_us.json",
          content: JSON.stringify({ menu: { title: "Hello" } }),
        },
      }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "amber" }) });
    expect(res.status).toBe(200);
    expect(mockImportLocaleIntoExistingProject).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "en_us",
        strings: [{ key: "menu.title", text: "Hello" }],
      }),
    );
  });
});

describe("POST /api/catalogs/upsert", () => {
  it("delegates machine imports to the project-level catalog service", async () => {
    const { POST } = await import("@/app/api/catalogs/upsert/route");
    mockRequireTokenScopes.mockResolvedValueOnce({ tokenId: "tok1", scopes: new Set(["catalog:write"]) });
    mockUpsertProjectLocaleCatalog.mockResolvedValueOnce({
      ok: true,
      locale: "zh_cn",
      mode: "translation",
      imported: 1,
      updated: 0,
      deactivated: 0,
      ignored_non_string: 0,
      skipped_unmatched: [],
    });

    const req = new Request("http://localhost/api/catalogs/upsert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer kaf_test",
      },
      body: JSON.stringify({
        mod: { slug: "amber", name: "Amber" },
        locale: "zh_cn",
        strings: [{ key: "menu.title", text: "你好" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpsertProjectLocaleCatalog).toHaveBeenCalledTimes(1);
  });
});
