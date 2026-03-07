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
const CONTRIBUTOR = { sub: "777", name: "Tester", avatar: null };
const TRUSTED = { sub: "999", name: "Trusted", avatar: null };

async function makeRequest(url: string, session: typeof CONTRIBUTOR | typeof TRUSTED | null, init: RequestInit = {}) {
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
  mockDbFirst.mockResolvedValue(null);
  mockDbAll.mockResolvedValue([]);
});

describe("POST /api/suggestions", () => {
  it("returns 422 on placeholder mismatch", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    mockDbFirst
      .mockResolvedValueOnce({ total: 0 })
      .mockResolvedValueOnce({
        id: "ss1",
        string_key: "key.test",
        source_text: "Hello %s",
        context: null,
        placeholder_sig: "%s",
        is_active: 1,
      });

    const req = await makeRequest("http://localhost/api/suggestions", CONTRIBUTOR, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_string_id: "ss1", locale: "fr_fr", text: "Bonjour" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("creates a suggestion with a valid payload", async () => {
    const { POST } = await import("@/app/api/suggestions/route");
    mockDbFirst
      .mockResolvedValueOnce({ total: 0 })
      .mockResolvedValueOnce({
        id: "ss1",
        string_key: "key.test",
        source_text: "Hello world",
        context: null,
        placeholder_sig: "",
        is_active: 1,
      })
      .mockResolvedValueOnce({
        project_slug: "demo-mod",
        string_key: "key.test",
      });

    const req = await makeRequest("http://localhost/api/suggestions", CONTRIBUTOR, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_string_id: "ss1", locale: "fr_fr", text: "Bonjour monde" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockDbRun).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/suggestions", () => {
  it("returns 403 when a non-trusted user requests the moderation view", async () => {
    const { GET } = await import("@/app/api/suggestions/route");
    mockDbFirst.mockResolvedValueOnce(null);
    const req = await makeRequest("http://localhost/api/suggestions?status=pending", CONTRIBUTOR);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns the contributor's own suggestions with project-only metadata", async () => {
    const { GET } = await import("@/app/api/suggestions/route");
    mockDbFirst.mockResolvedValueOnce({ total: 1 });
    mockDbAll.mockResolvedValueOnce([
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
        project_slug: "demo-mod",
        decision_note: null,
        decided_at: null,
        decided_by_discord_id: null,
      },
    ]);

    const req = await makeRequest("http://localhost/api/suggestions?mine=1&status=pending", CONTRIBUTOR);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.suggestions[0].project_slug).toBe("demo-mod");
    expect(json.suggestions[0].target_key).toBeUndefined();
  });
});
