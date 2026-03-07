/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifySession } from "@/lib/session";

vi.mock("@/lib/cf", () => ({
  getEnv: () => ({ SESSION_SECRET: "test-secret-1234567890abcdef" }),
}));

const mockDbRun = vi.fn();
vi.mock("@/lib/db", () => ({
  dbRun: (...args: unknown[]) => mockDbRun(...args),
  dbFirst: vi.fn(),
  dbAll: vi.fn(),
  getDB: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockDbRun.mockResolvedValue(undefined);
});

describe("GET /api/dev/login", () => {
  it("returns 404 outside localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/dev/login/route");
    const res = await GET(new Request("http://example.com/api/dev/login"));
    expect(res.status).toBe(404);
  });

  it("sets a session cookie for localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/dev/login/route");
    const res = await GET(
      new Request("http://localhost:3000/api/dev/login?sub=dev1&name=Dev%20User"),
    );

    expect(res.status).toBe(302);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("__session=");

    const cookieValue = /__session=([^;]+)/.exec(setCookie || "")?.[1];
    expect(cookieValue).toBeTruthy();

    const payload = await verifySession(
      decodeURIComponent(cookieValue as string),
      "test-secret-1234567890abcdef",
    );
    expect(payload).toEqual({ sub: "dev1", name: "Dev User", handle: null, avatar: null });
  });

  it("upserts trusted users when requested", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/dev/login/route");
    const res = await GET(
      new Request("http://localhost:3000/api/dev/login?sub=mod1&name=Mod&trusted=1"),
    );

    expect(res.status).toBe(302);
    expect(mockDbRun).toHaveBeenCalledTimes(1);
  });

  it("rejects god for any Discord ID except the configured one", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/dev/login/route");
    const res = await GET(
      new Request("http://localhost:3000/api/dev/login?sub=mod1&name=Mod&role=god"),
    );
    expect(res.status).toBe(409);
  });
});
