import { getEnv } from '@/lib/cf';

export function getDB(): D1Database {
  const env = getEnv();
  // Binding provided by Wrangler/OpenNext when configured.
  const db = (env as any).DB as D1Database | undefined;
  if (!db) {
    throw new Error('D1 binding DB is not configured. Add it to wrangler.jsonc as d1_databases[].');
  }
  return db;
}

export async function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = getDB();
  const res = await db.prepare(sql).bind(...params).all<T>();
  if (!res.success) throw new Error(res.error || 'DB error');
  return res.results || [];
}

export async function dbFirst<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const db = getDB();
  const res = await db.prepare(sql).bind(...params).first<T>();
  return (res ?? null) as T | null;
}

export async function dbRun(sql: string, params: unknown[] = []): Promise<void> {
  const db = getDB();
  const res = await db.prepare(sql).bind(...params).run();
  if (!res.success) throw new Error(res.error || 'DB error');
}
