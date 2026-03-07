/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signSession } from "@/lib/session";

vi.mock("@/lib/cf", () => ({
  getEnv: () => ({ SESSION_SECRET: "test-secret-1234567890abcdef" }),
}));

const mockDbFirst = vi.fn();
const mockDbAll = vi.fn();
const mockDbRun = vi.fn();
vi.mock("@/lib/db", () => ({
  dbFirst: (...args: unknown[]) => mockDbFirst(...args),
  dbAll: (...args: unknown[]) => mockDbAll(...args),
  dbRun: (...args: unknown[]) => mockDbRun(...args),
  getDB: vi.fn(),
}));

const SECRET = "test-secret-1234567890abcdef";
const GOD_SESSION = { sub: "517599684961894400", name: "Kaf", avatar: null };
const TRUSTED_SESSION = { sub: "123456789012345678", name: "Trusted", avatar: null };

async function makeRequest(
  url: string,
  session: typeof GOD_SESSION | null,
  init: RequestInit = {},
) {
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
  mockDbAll.mockResolvedValue([]);
});

describe("GET /api/users", () => {
  it("returns 403 for non-god users", async () => {
    const { GET } = await import("@/app/api/users/route");
    mockDbFirst.mockResolvedValueOnce({ role: "trusted" });
    const req = await makeRequest("http://localhost/api/users", TRUSTED_SESSION);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns managed users for the god account", async () => {
    const { GET } = await import("@/app/api/users/route");
    mockDbAll.mockResolvedValueOnce([
      {
        discord_id: "123456789012345678",
        display_name: "Trusted",
        discord_handle: "trusted-user",
        role: "trusted",
        added_by_discord_id: "517599684961894400",
        added_at: "2026-03-07T00:00:00.000Z",
      },
    ]);
    const req = await makeRequest("http://localhost/api/users?role=all", GOD_SESSION);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.users[0].discord_id).toBe("517599684961894400");
    expect(json.users[0].role).toBe("god");
    expect(json.users[1].discord_id).toBe("123456789012345678");
    expect(json.users[1].discord_handle).toBe("trusted-user");
  });
});

describe("POST /api/users", () => {
  it("rejects assigning god to any other Discord ID", async () => {
    const { POST } = await import("@/app/api/users/route");
    const req = await makeRequest("http://localhost/api/users", GOD_SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discord_id: "123456789012345678",
        role: "god",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("allows assigning trusted to a Discord ID", async () => {
    const { POST } = await import("@/app/api/users/route");
    mockDbFirst.mockResolvedValueOnce({ role: "trusted" });
    const req = await makeRequest("http://localhost/api/users", GOD_SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discord_id: "123456789012345678",
        display_name: "Trusted User",
        discord_handle: "@trusted-user",
        role: "trusted",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockDbRun).toHaveBeenCalledTimes(1);
  });
});

describe("PATCH /api/users/[discordId]", () => {
  it("does not allow demoting the configured god account", async () => {
    const { PATCH } = await import("@/app/api/users/[discordId]/route");
    const req = await makeRequest("http://localhost/api/users/517599684961894400", GOD_SESSION, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ discordId: "517599684961894400" }) });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/users/[discordId]", () => {
  it("deletes trusted assignments by Discord ID", async () => {
    const { DELETE } = await import("@/app/api/users/[discordId]/route");
    const req = await makeRequest("http://localhost/api/users/123456789012345678", GOD_SESSION, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ discordId: "123456789012345678" }) });
    expect(res.status).toBe(200);
    expect(mockDbRun).toHaveBeenCalledWith("DELETE FROM trusted_users WHERE discord_id = ?", [
      "123456789012345678",
    ]);
  });
});
