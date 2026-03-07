import { beforeEach, describe, expect, it, vi } from "vitest";
import { GOD_DISCORD_ID } from "@/lib/auth-constants";
import {
  getSession,
  signSession,
  syncElevatedUserProfile,
  upsertUserRole,
  verifySession,
} from "@/lib/session";

// Mock getEnv so session.ts can resolve SESSION_SECRET without Cloudflare context
vi.mock("@/lib/cf", () => ({
  getEnv: () => ({ SESSION_SECRET: "test-secret-1234567890abcdef" }),
}));

// Mock dbFirst for requireTrustedSession (not tested here, just prevent errors)
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
const PAYLOAD = { sub: "123456789", name: "TestUser", handle: "test-user", avatar: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("signSession + verifySession", () => {
  it("round-trips a payload", async () => {
    const token = await signSession(PAYLOAD, SECRET);
    const result = await verifySession(token, SECRET);
    expect(result).toEqual(PAYLOAD);
  });

  it("returns null for expired token", async () => {
    // Manually craft a token with exp in the past
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const pastClaims = { ...PAYLOAD, iat: 1000, exp: 1001 };
    const body = btoa(JSON.stringify(pastClaims))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    // Sign it properly
    const keyBytes = new TextEncoder().encode(SECRET);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${header}.${body}`),
    );
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const token = `${header}.${body}.${sigB64}`;
    const result = await verifySession(token, SECRET);
    expect(result).toBeNull();
  });

  it("returns null for tampered signature", async () => {
    const token = await signSession(PAYLOAD, SECRET);
    const tampered = token.slice(0, -4) + "xxxx";
    const result = await verifySession(tampered, SECRET);
    expect(result).toBeNull();
  });

  it("returns null for wrong secret", async () => {
    const token = await signSession(PAYLOAD, SECRET);
    const result = await verifySession(token, "wrong-secret");
    expect(result).toBeNull();
  });
});

describe("getSession", () => {
  it("returns null when cookie is missing", async () => {
    const req = new Request("http://localhost/");
    const result = await getSession(req);
    expect(result).toBeNull();
  });

  it("returns payload with valid __session cookie", async () => {
    const token = await signSession(PAYLOAD, SECRET);
    const req = new Request("http://localhost/", {
      headers: { Cookie: `__session=${encodeURIComponent(token)}` },
    });
    const result = await getSession(req);
    expect(result).toEqual(PAYLOAD);
  });

  it("returns null with invalid __session cookie", async () => {
    const req = new Request("http://localhost/", {
      headers: { Cookie: "__session=notavalidtoken" },
    });
    const result = await getSession(req);
    expect(result).toBeNull();
  });
});

describe("syncElevatedUserProfile", () => {
  it("skips regular users", async () => {
    mockDbFirst.mockResolvedValueOnce(null);
    await syncElevatedUserProfile({
      discordId: "123456789",
      displayName: "Regular",
      discordHandle: "regular",
      avatarUrl: "https://cdn.example/avatar.png",
    });
    expect(mockDbRun).not.toHaveBeenCalled();
  });

  it("upserts the configured god user profile", async () => {
    await syncElevatedUserProfile({
      discordId: GOD_DISCORD_ID,
      displayName: "Kaf",
      discordHandle: "iamkaf",
      avatarUrl: "https://cdn.example/kaf.png",
    });
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining("avatar_url"),
      [GOD_DISCORD_ID, "Kaf", "iamkaf", "https://cdn.example/kaf.png", "god"],
    );
  });
});

describe("upsertUserRole", () => {
  it("rejects assigning god to a non-configured Discord ID in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await expect(
      upsertUserRole({
        discordId: "123456789012345678",
        displayName: "Not God",
        role: "god",
        addedByDiscordId: GOD_DISCORD_ID,
      }),
    ).rejects.toThrow("Only the configured Discord ID may hold the god role");
  });
});
