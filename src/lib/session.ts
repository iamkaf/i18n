import { getEnv } from "@/lib/cf";
import { dbFirst } from "@/lib/db";

export type SessionPayload = {
  sub: string;
  name: string;
  avatar: string | null;
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
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64url(sig)}`;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
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
  const session = await requireSession(req);
  const row = await dbFirst<{ discord_id: string }>(
    "SELECT discord_id FROM trusted_users WHERE discord_id = ?",
    [session.sub],
  );
  if (!row) throw new Response("Forbidden", { status: 403 });
  return session;
}

export function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=${SESSION_DURATION_SECS}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0`;
}
