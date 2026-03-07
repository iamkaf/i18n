/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
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
const SESSION = { sub: "admin1", name: "Admin", avatar: null };
const UNTRUSTED = { sub: "user1", name: "User", avatar: null };

const PENDING_SUGGESTION = {
  id: "sug1",
  source_string_id: "ss1",
  locale: "fr_fr",
  text: "Bonjour",
  status: "pending",
  author_discord_id: "999",
};

async function makeRequest(url: string, session: typeof SESSION | null, init: RequestInit = {}) {
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
});

// ─── Approve ────────────────────────────────────────────────────────────────

describe("POST /api/suggestions/[id]/approve", () => {
  it("returns 401 without session", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/approve/route");
    const req = await makeRequest("http://localhost/api/suggestions/sug1/approve", null, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "sug1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 if not trusted", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/approve/route");
    // requireTrustedSession calls dbFirst for trusted_users check → null = not trusted
    mockDbFirst.mockResolvedValue(null);
    const req = await makeRequest("http://localhost/api/suggestions/sug1/approve", UNTRUSTED, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "sug1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 if suggestion missing", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/approve/route");
    // First call: trusted_users → trusted; second call: suggestion → null
    mockDbFirst.mockResolvedValueOnce({ discord_id: SESSION.sub }).mockResolvedValueOnce(null);
    const req = await makeRequest("http://localhost/api/suggestions/missing/approve", SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 409 if suggestion is not pending", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/approve/route");
    mockDbFirst
      .mockResolvedValueOnce({ discord_id: SESSION.sub })
      .mockResolvedValueOnce({ ...PENDING_SUGGESTION, status: "accepted" });
    const req = await makeRequest("http://localhost/api/suggestions/sug1/approve", SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "sug1" }) });
    expect(res.status).toBe(409);
  });

  it("returns 200 and upserts translation on success", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/approve/route");
    mockDbFirst
      .mockResolvedValueOnce({ discord_id: SESSION.sub })
      .mockResolvedValueOnce(PENDING_SUGGESTION);
    const req = await makeRequest("http://localhost/api/suggestions/sug1/approve", SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision_note: "LGTM" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "sug1" }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    // Two dbRun calls: update suggestion + upsert translation
    expect(mockDbRun).toHaveBeenCalledTimes(2);
  });
});

// ─── Reject ─────────────────────────────────────────────────────────────────

describe("POST /api/suggestions/[id]/reject", () => {
  it("returns 401 without session", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/reject/route");
    const req = await makeRequest("http://localhost/api/suggestions/sug1/reject", null, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "sug1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 if not trusted", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/reject/route");
    mockDbFirst.mockResolvedValue(null);
    const req = await makeRequest("http://localhost/api/suggestions/sug1/reject", UNTRUSTED, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "sug1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 if decision_note is missing", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/reject/route");
    mockDbFirst
      .mockResolvedValueOnce({ discord_id: SESSION.sub })
      .mockResolvedValueOnce(PENDING_SUGGESTION);
    const req = await makeRequest("http://localhost/api/suggestions/sug1/reject", SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "sug1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 200 on success", async () => {
    const { POST } = await import("@/app/api/suggestions/[id]/reject/route");
    mockDbFirst
      .mockResolvedValueOnce({ discord_id: SESSION.sub })
      .mockResolvedValueOnce(PENDING_SUGGESTION);
    const req = await makeRequest("http://localhost/api/suggestions/sug1/reject", SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision_note: "Incorrect translation" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "sug1" }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(mockDbRun).toHaveBeenCalledTimes(1);
  });
});
