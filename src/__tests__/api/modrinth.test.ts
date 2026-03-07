/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signSession } from "@/lib/session";

vi.mock("@/lib/cf", () => ({
  getEnv: () => ({ SESSION_SECRET: "test-secret-1234567890abcdef" }),
}));

const mockDbFirst = vi.fn();
const mockDbRun = vi.fn();
vi.mock("@/lib/db", () => ({
  dbFirst: (...args: unknown[]) => mockDbFirst(...args),
  dbAll: vi.fn(),
  dbRun: (...args: unknown[]) => mockDbRun(...args),
  getDB: vi.fn(),
}));

const SECRET = "test-secret-1234567890abcdef";
const GOD_SESSION = { sub: "517599684961894400", name: "Kaf", avatar: null };
const TRUSTED_SESSION = { sub: "123456789012345678", name: "Trusted", avatar: null };

const AMBER_PROJECT = {
  id: "vjGZJDu5",
  slug: "amber",
  title: "Amber",
  description: "Multiloader library",
  icon_url: "https://cdn.modrinth.com/data/amber/icon.png",
  project_type: "mod",
  updated: "2026-02-14T20:26:44Z",
  published: "2026-01-01T00:00:00Z",
  source_url: "https://github.com/iamkaf/amber",
  game_versions: ["1.21.10"],
  loaders: ["fabric", "forge"],
};

function buildResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function makeRequest(url: string, session: typeof GOD_SESSION | typeof TRUSTED_SESSION | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (session) {
    const token = await signSession(session, SECRET);
    headers.set("Cookie", `__session=${encodeURIComponent(token)}`);
  }
  return new Request(url, { ...init, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDbRun.mockResolvedValue(undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/v2/user/iamkaf/projects")) {
        return buildResponse([AMBER_PROJECT]);
      }
      if (url.includes("/v2/project/amber") || url.includes(`/v2/project/${AMBER_PROJECT.id}`)) {
        return buildResponse(AMBER_PROJECT);
      }
      if (url.includes("https://gh.kaf.sh/api/iamkaf/amber")) {
        return buildResponse({
          files: [
            "common/src/main/resources/assets/amber/lang/en_us.json",
            "common/src/main/resources/assets/amber/lang/zh_cn.json",
          ],
          repository: {
            owner: "iamkaf",
            name: "amber",
            html_url: "https://github.com/iamkaf/amber",
            default_branch: "main",
            homepage: "https://modrinth.com/mod/amber",
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as any,
  );
});

describe("GET /api/modrinth/projects", () => {
  it("rejects non-god users", async () => {
    const { GET } = await import("@/app/api/modrinth/projects/route");
    mockDbFirst.mockResolvedValueOnce({ role: "trusted" });
    const req = await makeRequest("http://localhost/api/modrinth/projects?username=iamkaf", TRUSTED_SESSION);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("looks up projects by username and annotates locale files", async () => {
    const { GET } = await import("@/app/api/modrinth/projects/route");
    mockDbFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "local1",
        slug: "amber-local",
        name: "Amber Local",
        visibility: "private",
        modrinth_project_id: null,
        github_repo_url: null,
      });

    const req = await makeRequest("http://localhost/api/modrinth/projects?username=iamkaf", GOD_SESSION);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.mode).toBe("username");
    expect(json.projects[0].local_project.slug).toBe("amber-local");
    expect(json.projects[0].github_repo.html_url).toBe("https://github.com/iamkaf/amber");
    expect(json.projects[0].locale_files).toEqual([
      {
        locale: "en_us",
        path: "common/src/main/resources/assets/amber/lang/en_us.json",
        source: "github",
        kind: "source",
      },
      {
        locale: "zh_cn",
        path: "common/src/main/resources/assets/amber/lang/zh_cn.json",
        source: "github",
        kind: "translation",
      },
    ]);
  });

  it("accepts a pasted project URL", async () => {
    const { GET } = await import("@/app/api/modrinth/projects/route");
    mockDbFirst.mockResolvedValue(null);
    const req = await makeRequest(
      "http://localhost/api/modrinth/projects?project=https%3A%2F%2Fmodrinth.com%2Fmod%2Famber",
      GOD_SESSION,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.projects[0].slug).toBe("amber");
  });
});

describe("POST /api/modrinth/import", () => {
  it("creates a new local project shell and returns locale discovery", async () => {
    const { POST } = await import("@/app/api/modrinth/import/route");
    mockDbFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "local1",
        slug: "amber",
        name: "Amber",
        visibility: "private",
        modrinth_project_id: "vjGZJDu5",
        modrinth_slug: "amber",
        icon_url: AMBER_PROJECT.icon_url,
        github_repo_url: null,
        updated_at: "2026-03-07T00:00:00.000Z",
      });

    const req = await makeRequest("http://localhost/api/modrinth/import", GOD_SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: { id: "vjGZJDu5", slug: "amber" },
        project: { slug: "amber", name: "Amber", visibility: "private" },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.action).toBe("created");
    expect(json.locale_files).toHaveLength(2);
    expect(mockDbRun).toHaveBeenCalledTimes(1);
  });

  it("returns 409 for a conflicting linked slug", async () => {
    const { POST } = await import("@/app/api/modrinth/import/route");
    mockDbFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "other",
        slug: "amber",
        name: "Other",
        visibility: "private",
        modrinth_project_id: "different",
        github_repo_url: null,
      });

    const req = await makeRequest("http://localhost/api/modrinth/import", GOD_SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: { id: "vjGZJDu5", slug: "amber" },
        project: { slug: "amber", name: "Amber", visibility: "private" },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
