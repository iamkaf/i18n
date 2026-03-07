/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signSession } from "@/lib/session";

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

describe("GET /api/dev/promote", () => {
  it("returns 404 outside localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/dev/promote/route");
    const res = await GET(new Request("http://example.com/api/dev/promote"));
    expect(res.status).toBe(404);
  });

  it("returns 401 without a session", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/dev/promote/route");
    const res = await GET(new Request("http://localhost:3000/api/dev/promote"));
    expect(res.status).toBe(401);
  });

  it("promotes the current session user", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/dev/promote/route");
    const token = await signSession(
      { sub: "user-123", name: "User Name", avatar: null },
      "test-secret-1234567890abcdef",
    );
    const res = await GET(
      new Request("http://localhost:3000/api/dev/promote?redirect=/moderation", {
        headers: { cookie: `__session=${encodeURIComponent(token)}` },
      }),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/moderation");
    expect(mockDbRun).toHaveBeenCalledWith(expect.any(String), [
      "user-123",
      "User Name",
      "trusted",
      "dev-promote",
    ]);
  });
});
