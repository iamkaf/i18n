import { describe, it, expect, vi } from "vitest";
import { signSession } from "@/lib/session";

vi.mock("@/lib/cf", () => ({
  getEnv: () => ({ SESSION_SECRET: "test-secret-1234567890abcdef" }),
}));

vi.mock("@/lib/db", () => ({
  dbFirst: vi.fn(),
  dbAll: vi.fn(),
  dbRun: vi.fn(),
  getDB: vi.fn(),
}));

const SECRET = "test-secret-1234567890abcdef";
const USER = { sub: "111222333", name: "DiscordUser", avatar: null };

describe("GET /api/auth/me", () => {
  it("returns { user: null } without cookie", async () => {
    const { GET } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost/api/auth/me");
    const res = await GET(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any;
    expect(json.user).toBeNull();
  });

  it("returns user payload with valid __session cookie", async () => {
    const { GET } = await import("@/app/api/auth/me/route");
    const token = await signSession(USER, SECRET);
    const req = new Request("http://localhost/api/auth/me", {
      headers: { Cookie: `__session=${encodeURIComponent(token)}` },
    });
    const res = await GET(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any;
    expect(json.user?.sub).toBe(USER.sub);
    expect(json.user?.name).toBe(USER.name);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("__session=");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
  });
});
