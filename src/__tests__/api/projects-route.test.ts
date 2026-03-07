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
  dbRun: (...args: unknown[]) => mockDbRun(...args),
  dbAll: vi.fn(),
  getDB: vi.fn(),
}));

const SECRET = "test-secret-1234567890abcdef";
const GOD_SESSION = { sub: "517599684961894400", name: "Kaf", avatar: null };

async function makeRequest(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = await signSession(GOD_SESSION, SECRET);
  headers.set("Cookie", `__session=${encodeURIComponent(token)}`);
  return new Request(url, { ...init, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDbRun.mockResolvedValue(undefined);
});

describe("PATCH /api/projects/[slug]", () => {
  it("updates project metadata including a manual GitHub repo URL", async () => {
    const { PATCH } = await import("@/app/api/projects/[slug]/route");
    mockDbFirst
      .mockResolvedValueOnce({ id: "p1" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "p1",
        slug: "amber-updated",
        name: "Amber Updated",
        visibility: "public",
        default_locale: "en_us",
        icon_url: null,
        modrinth_project_id: "vjGZJDu5",
        modrinth_slug: "amber",
        github_repo_url: "https://github.com/iamkaf/amber",
        updated_at: "2026-03-07T00:00:00.000Z",
      });

    const req = await makeRequest("http://localhost/api/projects/amber", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "amber-updated",
        name: "Amber Updated",
        visibility: "public",
        github_repo_url: "https://github.com/iamkaf/amber/tree/main",
      }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ slug: "amber" }) });
    expect(res.status).toBe(200);
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining("github_repo_url"),
      [
        "amber-updated",
        "Amber Updated",
        "public",
        "https://github.com/iamkaf/amber",
        expect.any(String),
        "p1",
      ],
    );
    const json = (await res.json()) as any;
    expect(json.project.github_repo_url).toBe("https://github.com/iamkaf/amber");
  });

  it("rejects invalid GitHub repo URLs", async () => {
    const { PATCH } = await import("@/app/api/projects/[slug]/route");
    mockDbFirst.mockResolvedValueOnce({ id: "p1" });

    const req = await makeRequest("http://localhost/api/projects/amber", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "amber",
        name: "Amber",
        visibility: "private",
        github_repo_url: "https://example.com/not-github",
      }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ slug: "amber" }) });
    expect(res.status).toBe(422);
  });
});
