import { getDB } from '@/lib/db';
import { requireTokenScopes } from '@/lib/auth';
import { computePlaceholderSig } from '@/lib/placeholders';

export const runtime = 'edge';

type CatalogUpsertPayload = {
  mod: {
    slug: string;
    name: string;
    visibility?: 'public' | 'private';
    modrinth?: { projectId?: string; slug?: string; iconUrl?: string };
  };
  target: {
    key: string;
    label?: string;
    sourceRevision?: string;
    sourceHash?: string;
  };
  defaultLocale?: 'en_us';
  strings: Array<{ key: string; text: string; context?: string }>;
};

function bad(msg: string, status = 400) {
  return new Response(msg, { status });
}

export async function POST(req: Request) {
  await requireTokenScopes(req, ['catalog:write']);

  let payload: CatalogUpsertPayload;
  try {
    payload = (await req.json()) as CatalogUpsertPayload;
  } catch {
    return bad('Invalid JSON');
  }

  if (!payload?.mod?.slug || !payload?.mod?.name) return bad('mod.slug and mod.name are required');
  if (!payload?.target?.key) return bad('target.key is required');
  if (!Array.isArray(payload?.strings)) return bad('strings must be an array');

  const visibility = payload.mod.visibility ?? 'private';
  if (visibility !== 'public' && visibility !== 'private') return bad('mod.visibility must be public|private');

  const db = getDB();

  const now = new Date().toISOString();

  // Upsert project
  const projectId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO projects (id, slug, name, visibility, default_locale, modrinth_project_id, modrinth_slug, icon_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'en_us', ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         visibility = excluded.visibility,
         modrinth_project_id = COALESCE(excluded.modrinth_project_id, projects.modrinth_project_id),
         modrinth_slug = COALESCE(excluded.modrinth_slug, projects.modrinth_slug),
         icon_url = COALESCE(excluded.icon_url, projects.icon_url),
         updated_at = excluded.updated_at`
    )
    .bind(
      projectId,
      payload.mod.slug,
      payload.mod.name,
      visibility,
      payload.mod.modrinth?.projectId ?? null,
      payload.mod.modrinth?.slug ?? null,
      payload.mod.modrinth?.iconUrl ?? null,
      now,
      now
    )
    .run();

  const proj = await db
    .prepare(`SELECT id FROM projects WHERE slug = ?`)
    .bind(payload.mod.slug)
    .first<{ id: string }>();

  if (!proj?.id) return new Response('Failed to upsert project', { status: 500 });

  // Upsert target
  const targetId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO targets (id, project_id, key, label, source_revision, source_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id, key) DO UPDATE SET
         label = excluded.label,
         source_revision = excluded.source_revision,
         source_hash = excluded.source_hash,
         updated_at = excluded.updated_at`
    )
    .bind(
      targetId,
      proj.id,
      payload.target.key,
      payload.target.label ?? null,
      payload.target.sourceRevision ?? null,
      payload.target.sourceHash ?? null,
      now,
      now
    )
    .run();

  const tgt = await db
    .prepare(`SELECT id FROM targets WHERE project_id = ? AND key = ?`)
    .bind(proj.id, payload.target.key)
    .first<{ id: string }>();

  if (!tgt?.id) return new Response('Failed to upsert target', { status: 500 });

  // Replace strings for this target:
  // - mark all inactive
  // - upsert incoming keys as active
  await db.prepare(`UPDATE source_strings SET is_active = 0, updated_at = ? WHERE target_id = ?`).bind(now, tgt.id).run();

  const stmts = payload.strings.map((s) => {
    const id = crypto.randomUUID();
    const sig = computePlaceholderSig(s.text ?? '');
    return db
      .prepare(
        `INSERT INTO source_strings (id, target_id, string_key, source_text, context, placeholder_sig, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(target_id, string_key) DO UPDATE SET
           source_text = excluded.source_text,
           context = excluded.context,
           placeholder_sig = excluded.placeholder_sig,
           is_active = 1,
           updated_at = excluded.updated_at`
      )
      .bind(id, tgt.id, s.key, s.text, s.context ?? null, sig, now, now);
  });

  if (stmts.length) {
    await db.batch(stmts);
  }

  return Response.json({ ok: true, project: payload.mod.slug, target: payload.target.key, strings: stmts.length });
}
