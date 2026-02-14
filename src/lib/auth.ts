import { dbFirst, dbRun } from '@/lib/db';

function hex(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hexStr: string): Uint8Array {
  const out = new Uint8Array(hexStr.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export type TokenScope = 'catalog:write' | 'export:read' | 'moderate:write';

export type ApiTokenRow = {
  id: string;
  name: string;
  token_hash: string;
  scopes: string;
  disabled: number;
};

export function parseBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return m[1]?.trim() || null;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return hex(digest);
}

export async function hashTokenForStorage(token: string, saltHex: string): Promise<string> {
  // Token hash format: sha256$<saltHex>$<digestHex>
  // Optional pepper via env is applied by the caller.
  const salt = saltHex;
  const pepper = (process.env.KAF_TOKEN_PEPPER || '').trim();
  // salt + token + pepper
  return sha256Hex(`${salt}:${token}:${pepper}`);
}

export async function requireTokenScopes(req: Request, needed: TokenScope[]): Promise<{ tokenId: string; scopes: Set<string> }> {
  const token = parseBearerToken(req);
  if (!token || !token.startsWith('kaf_')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  // We store token hashes as: sha256$<saltHex>$<digestHex>
  // Since we can’t search by raw token, we do a small scan of enabled tokens.
  // This is fine for an atelier-scale token count.
  const rows = await dbFirst<{ json: string }>(
    `SELECT json_group_array(json_object('id', id, 'token_hash', token_hash, 'scopes', scopes, 'disabled', disabled)) as json
     FROM api_tokens
     WHERE disabled = 0`
  );

  const list = (rows?.json ? JSON.parse(rows.json) : []) as Array<Pick<ApiTokenRow, 'id' | 'token_hash' | 'scopes' | 'disabled'>>;

  let match: { id: string; scopes: string } | null = null;
  for (const row of list) {
    const parts = String(row.token_hash || '').split('$');
    if (parts.length !== 3 || parts[0] !== 'sha256') continue;
    const saltHex = parts[1];
    const expectedHex = parts[2];
    const gotHex = await hashTokenForStorage(token, saltHex);
    if (timingSafeEqualBytes(fromHex(gotHex), fromHex(expectedHex))) {
      match = { id: row.id, scopes: row.scopes || '' };
      break;
    }
  }

  if (!match) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const scopes = new Set((match.scopes || '').split(/\s+/g).filter(Boolean));
  for (const s of needed) {
    if (!scopes.has(s)) {
      throw new Response('Forbidden', { status: 403 });
    }
  }

  // Best-effort last_used_at update
  try {
    await dbRun(`UPDATE api_tokens SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, [match.id]);
  } catch {
    // ignore
  }

  return { tokenId: match.id, scopes };
}
