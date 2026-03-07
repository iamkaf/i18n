import { dbAll } from "@/lib/db";
import { getSession } from "@/lib/session";

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  default_locale: string;
  icon_url: string | null;
  modrinth_slug: string | null;
  target_count: number;
  updated_at: string;
};

export async function GET(req: Request) {
  const session = await getSession(req);
  const url = new URL(req.url);
  const query = (url.searchParams.get("q") || "").trim();

  const where: string[] = [];
  const params: unknown[] = [];

  if (!session) where.push(`p.visibility = 'public'`);
  if (query) {
    where.push(`(p.slug LIKE ? OR p.name LIKE ?)`);
    const q = `%${query}%`;
    params.push(q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await dbAll<ProjectRow>(
    `SELECT
       p.id,
       p.slug,
       p.name,
       p.visibility,
       p.default_locale,
       p.icon_url,
       p.modrinth_slug,
       p.updated_at,
       COUNT(t.id) as target_count
     FROM projects p
     LEFT JOIN targets t ON t.project_id = p.id
     ${whereSql}
     GROUP BY p.id
     ORDER BY p.updated_at DESC, p.slug ASC`,
    params,
  );

  return Response.json({ ok: true, projects: rows });
}
