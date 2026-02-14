import { dbAll, dbFirst } from '@/lib/db';
import { requireTokenScopes } from '@/lib/auth';

export const runtime = 'edge';

type Params = { project: string; target: string; locale: string };

export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  const { project, target, locale } = await ctx.params;

  const proj = await dbFirst<{ id: string; visibility: 'public' | 'private'; default_locale: string }>(
    `SELECT id, visibility, default_locale FROM projects WHERE slug = ?`,
    [project]
  );
  if (!proj) return new Response('Not found', { status: 404 });

  if (proj.visibility !== 'public') {
    await requireTokenScopes(req, ['export:read']);
  }

  const tgt = await dbFirst<{ id: string }>(
    `SELECT id FROM targets WHERE project_id = ? AND key = ?`,
    [proj.id, target]
  );
  if (!tgt) return new Response('Not found', { status: 404 });

  const rows = await dbAll<{ string_key: string; text: string }>(
    `
    SELECT ss.string_key as string_key,
           COALESCE(tr.text, ss.source_text) as text
    FROM source_strings ss
    LEFT JOIN translations tr
      ON tr.source_string_id = ss.id AND tr.locale = ? AND tr.status = 'approved'
    WHERE ss.target_id = ? AND ss.is_active = 1
    ORDER BY ss.string_key ASC
    `,
    [locale, tgt.id]
  );

  const body: Record<string, string> = {};
  for (const r of rows) body[r.string_key] = r.text;

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Public projects can be cached aggressively at the edge.
      'cache-control': proj.visibility === 'public' ? 'public, max-age=60, s-maxage=3600' : 'private, max-age=0, no-store'
    }
  });
}
