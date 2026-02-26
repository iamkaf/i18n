/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
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
const SESSION = { sub: "777", name: "Tester", avatar: null };

async function makeAuthedRequest(url: string, init: RequestInit = {}) {
  const token = await signSession(SESSION, SECRET);
  const headers = new Headers(init.headers);
  headers.set("Cookie", `__session=${encodeURIComponent(token)}`);
  return new Request(url, { ...init, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDbRun.mockResolvedValue(undefined);
  mockDbFirst.mockResolvedValue(null);
  mockDbAll.mockResolvedValue([]);
});

describe("POST /api/suggestions", () => {
  it("returns 401 without session", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    const req = new Request("http://localhost/api/suggestions", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 422 on placeholder mismatch", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    mockDbFirst.mockResolvedValue({
      id: "ss1",
      target_id: "t1",
      string_key: "key.test",
      source_text: "Hello %s",
      context: null,
      placeholder_sig: "%s",
      is_active: 1,
    });
    const req = await makeAuthedRequest("http://localhost/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_string_id: "ss1", locale: "fr_fr", text: "Bonjour" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = (await res.json()) as any;
    expect(json.error).toContain("Placeholder mismatch");
  });

  it("returns 201 with valid payload", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    mockDbFirst.mockResolvedValue({
      id: "ss1",
      target_id: "t1",
      string_key: "key.test",
      source_text: "Hello world",
      context: null,
      placeholder_sig: "",
      is_active: 1,
    });
    const req = await makeAuthedRequest("http://localhost/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_string_id: "ss1", locale: "fr_fr", text: "Bonjour monde" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(typeof json.id).toBe("string");
  });

  it("returns 404 if source string not found", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    mockDbFirst.mockResolvedValue(null);
    const req = await makeAuthedRequest("http://localhost/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_string_id: "missing", locale: "fr_fr", text: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/suggestions", () => {
  it("returns 401 without session", async () => {
    const { GET } = await import("@/app/api/suggestions/route");
    const req = new Request("http://localhost/api/suggestions");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns paginated list", async () => {
    const { GET } = await import("@/app/api/suggestions/route");
    mockDbFirst.mockResolvedValue({ total: 2 });
    mockDbAll.mockResolvedValue([
      {
        id: "sug1",
        locale: "fr_fr",
        text: "Bonjour",
        author_discord_id: "777",
        author_name: "Tester",
        status: "pending",
        created_at: "2026-01-01T00:00:00.000Z",
        source_string_id: "ss1",
        string_key: "key.test",
        source_text: "Hello",
        context: null,
        placeholder_sig: "",
        project_slug: "mymod",
        target_key: "latest",
      },
    ]);
    const req = await makeAuthedRequest("http://localhost/api/suggestions?status=pending");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.total).toBe(2);
    expect(json.suggestions).toHaveLength(1);
    expect(json.suggestions[0].id).toBe("sug1");
  });
});
