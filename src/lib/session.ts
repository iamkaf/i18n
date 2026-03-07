import { getEnv } from "@/lib/cf";
import { dbAll, dbFirst, dbRun } from "@/lib/db";

export type SessionPayload = {
  sub: string;
  name: string;
  avatar: string | null;
};

export type UserRole = "user" | "trusted" | "god";
export const GOD_DISCORD_ID = "517599684961894400";

export type SessionState = {
  user: SessionPayload | null;
  role: UserRole;
  trusted: boolean;
  god: boolean;
};

const COOKIE_NAME = "__session";
const SESSION_DURATION_SECS = 7 * 24 * 60 * 60; // 7 days

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + SESSION_DURATION_SECS };
  const body = base64url(new TextEncoder().encode(JSON.stringify(claims)));
  const signingInput = `${header}.${body}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(sig)}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const signingInput = `${header}.${body}`;
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(signature),
    new TextEncoder().encode(signingInput),
  );
  if (!valid) return null;
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === "number" && claims.exp < now) return null;
  if (typeof claims.sub !== "string" || typeof claims.name !== "string") return null;
  return {
    sub: claims.sub,
    name: claims.name,
    avatar: typeof claims.avatar === "string" ? claims.avatar : null,
  };
}

function getSecret(): string {
  const env = getEnv();
  const s = (env as unknown as Record<string, string>).SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not configured");
  return s;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get("cookie") ?? "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

export async function getSession(req: Request): Promise<SessionPayload | null> {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return await verifySession(token, getSecret());
  } catch {
    return null;
  }
}

export async function requireSession(req: Request): Promise<SessionPayload> {
  const session = await getSession(req);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

export async function requireTrustedSession(req: Request): Promise<SessionPayload> {
  return requireRole(req, "trusted");
}

function normalizeRole(role: string | null | undefined): UserRole {
  return role === "god" ? "god" : role === "trusted" ? "trusted" : "user";
}

export function hasRequiredRole(role: UserRole, minimumRole: Exclude<UserRole, "user">): boolean {
  if (minimumRole === "trusted") return role === "trusted" || role === "god";
  return role === "god";
}

async function getStoredRole(discordId: string): Promise<UserRole> {
  if (discordId === GOD_DISCORD_ID) return "god";

  try {
    const row = await dbFirst<{ role: string }>(
      "SELECT role FROM trusted_users WHERE discord_id = ?",
      [discordId],
    );
    return row ? normalizeRole(row.role) : "user";
  } catch {
    const legacyRow = await dbFirst<{ discord_id: string }>(
      "SELECT discord_id FROM trusted_users WHERE discord_id = ?",
      [discordId],
    );
    return legacyRow ? "trusted" : "user";
  }
}

export async function getUserRole(discordId: string): Promise<UserRole> {
  return getStoredRole(discordId);
}

export async function isTrustedUser(discordId: string): Promise<boolean> {
  return hasRequiredRole(await getUserRole(discordId), "trusted");
}

export async function isGodUser(discordId: string): Promise<boolean> {
  return (await getUserRole(discordId)) === "god";
}

export async function requireRole(
  req: Request,
  minimumRole: Exclude<UserRole, "user">,
): Promise<SessionPayload> {
  const session = await requireSession(req);
  if (!hasRequiredRole(await getUserRole(session.sub), minimumRole)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return session;
}

export async function requireGodSession(req: Request): Promise<SessionPayload> {
  return requireRole(req, "god");
}

export async function getSessionState(req: Request): Promise<SessionState> {
  const user = await getSession(req);
  const role = user ? await getUserRole(user.sub) : "user";
  return {
    user,
    role,
    trusted: hasRequiredRole(role, "trusted"),
    god: role === "god",
  };
}

export async function upsertUserRole(input: {
  discordId: string;
  displayName?: string | null;
  role: Exclude<UserRole, "user">;
  addedByDiscordId: string;
}): Promise<void> {
  if (input.role === "god" && input.discordId !== GOD_DISCORD_ID) {
    throw new Error("Only the configured Discord ID may hold the god role");
  }

  await dbRun(
    `INSERT INTO trusted_users (discord_id, display_name, role, added_by_discord_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(discord_id) DO UPDATE SET
       display_name = excluded.display_name,
       role = excluded.role,
       added_by_discord_id = excluded.added_by_discord_id`,
    [input.discordId, input.displayName ?? null, input.role, input.addedByDiscordId],
  );
}

export async function removeUserRole(discordId: string): Promise<void> {
  if (discordId === GOD_DISCORD_ID) {
    throw new Error("The configured god user cannot be demoted");
  }
  await dbRun("DELETE FROM trusted_users WHERE discord_id = ?", [discordId]);
}

export type ManagedUser = {
  discord_id: string;
  display_name: string | null;
  role: Exclude<UserRole, "user">;
  added_by_discord_id: string | null;
  added_at: string;
};

export async function listManagedUsers(input?: {
  search?: string;
  role?: Exclude<UserRole, "user"> | "all";
}): Promise<ManagedUser[]> {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (input?.search?.trim()) {
    conditions.push("(discord_id LIKE ? OR COALESCE(display_name, '') LIKE ?)");
    const pattern = `%${input.search.trim()}%`;
    params.push(pattern, pattern);
  }

  if (input?.role && input.role !== "all") {
    conditions.push("role = ?");
    params.push(input.role);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  let rows: ManagedUser[];
  try {
    rows = await dbAll<ManagedUser>(
      `SELECT discord_id, display_name, role, added_by_discord_id, added_at
       FROM trusted_users
       ${where}
       ORDER BY CASE role WHEN 'god' THEN 0 ELSE 1 END, COALESCE(display_name, discord_id)`,
      params,
    );
  } catch {
    const legacyRoleWhere =
      input?.role && input.role !== "all" && input.role !== "trusted" ? "WHERE 1 = 0" : where;
    rows = await dbAll<ManagedUser>(
      `SELECT discord_id, display_name, 'trusted' AS role, added_by_discord_id, added_at
       FROM trusted_users
       ${legacyRoleWhere}
       ORDER BY COALESCE(display_name, discord_id)`,
      params,
    );
  }

  const includesGod = rows.some((row) => row.discord_id === GOD_DISCORD_ID);
  const matchesGodRole = !input?.role || input.role === "all" || input.role === "god";
  const matchesGodSearch = !input?.search?.trim() || GOD_DISCORD_ID.includes(input.search.trim());
  if (!includesGod && matchesGodRole && matchesGodSearch) {
    rows.unshift({
      discord_id: GOD_DISCORD_ID,
      display_name: null,
      role: "god",
      added_by_discord_id: "system",
      added_at: "",
    });
  }

  return rows;
}

export function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=${SESSION_DURATION_SECS}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0`;
}
