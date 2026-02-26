import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBearerToken, hashTokenForStorage, requireTokenScopes } from "@/lib/auth";

vi.mock("@/lib/cf", () => ({
  getEnv: () => ({}),
}));

const mockDbFirst = vi.fn();
const mockDbRun = vi.fn();
vi.mock("@/lib/db", () => ({
  dbFirst: (...args: unknown[]) => mockDbFirst(...args),
  dbRun: (...args: unknown[]) => mockDbRun(...args),
  dbAll: vi.fn(),
  getDB: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockDbRun.mockResolvedValue(undefined);
});

describe("parseBearerToken", () => {
  it("extracts token from Authorization header", () => {
    const req = new Request("http://localhost/", {
      headers: { Authorization: "Bearer kaf_abc123" },
    });
    expect(parseBearerToken(req)).toBe("kaf_abc123");
  });

  it("returns null when header is missing", () => {
    const req = new Request("http://localhost/");
    expect(parseBearerToken(req)).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    const req = new Request("http://localhost/", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(parseBearerToken(req)).toBeNull();
  });
});

describe("hashTokenForStorage", () => {
  it("produces deterministic output for same inputs", async () => {
    const h1 = await hashTokenForStorage("kaf_token", "aabbcc");
    const h2 = await hashTokenForStorage("kaf_token", "aabbcc");
    expect(h1).toBe(h2);
  });

  it("produces different output for different salts", async () => {
    const h1 = await hashTokenForStorage("kaf_token", "aabbcc");
    const h2 = await hashTokenForStorage("kaf_token", "ddeeff");
    expect(h1).not.toBe(h2);
  });
});

describe("requireTokenScopes", () => {
  it("throws 401 when no bearer token", async () => {
    const req = new Request("http://localhost/");
    const err = (await requireTokenScopes(req, ["catalog:write"]).catch((e) => e)) as Response;
    expect(err).toBeInstanceOf(Response);
    expect(err.status).toBe(401);
  });

  it("throws 401 when token not in DB", async () => {
    mockDbFirst.mockResolvedValue({ json: "[]" });
    const req = new Request("http://localhost/", {
      headers: { Authorization: "Bearer kaf_unknowntoken" },
    });
    const err = (await requireTokenScopes(req, ["catalog:write"]).catch((e) => e)) as Response;
    expect(err).toBeInstanceOf(Response);
    expect(err.status).toBe(401);
  });

  it("throws 403 when token lacks required scope", async () => {
    const token = "kaf_testtoken123";
    const salt = "deadbeef";
    const hash = await hashTokenForStorage(token, salt);
    mockDbFirst.mockResolvedValue({
      json: JSON.stringify([
        { id: "t1", token_hash: `sha256$${salt}$${hash}`, scopes: "export:read", disabled: 0 },
      ]),
    });
    mockDbRun.mockResolvedValue(undefined);
    const req = new Request("http://localhost/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const err = (await requireTokenScopes(req, ["catalog:write"]).catch((e) => e)) as Response;
    expect(err).toBeInstanceOf(Response);
    expect(err.status).toBe(403);
  });

  it("returns tokenId and scopes for valid token + scope", async () => {
    const token = "kaf_validtoken456";
    const salt = "cafebabe";
    const hash = await hashTokenForStorage(token, salt);
    mockDbFirst.mockResolvedValue({
      json: JSON.stringify([
        {
          id: "t2",
          token_hash: `sha256$${salt}$${hash}`,
          scopes: "catalog:write export:read",
          disabled: 0,
        },
      ]),
    });
    mockDbRun.mockResolvedValue(undefined);
    const req = new Request("http://localhost/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await requireTokenScopes(req, ["catalog:write"]);
    expect(result.tokenId).toBe("t2");
    expect(result.scopes.has("catalog:write")).toBe(true);
    expect(result.scopes.has("export:read")).toBe(true);
  });
});
