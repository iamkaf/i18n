import { dbAll, dbFirst } from "@/lib/db";
import { getSession, requireSession } from "@/lib/session";

type ProjectRow = {
  id: string;
  slug: string;
  visibility: "public" | "private";
  default_locale: string;
};

type CountRow = {
  total: number;
};

type StringRow = {
  id: string;
  string_key: string;
  source_text: string;
  context: string | null;
  placeholder_sig: string;
  approved_translation: string | null;
  my_suggestion_id: string | null;
  my_suggestion_locale: string | null;
  my_suggestion_text: string | null;
  my_suggestion_status: "pending" | "accepted" | "rejected" | null;
  my_suggestion_created_at: string | null;
};

async function requireProjectAccess(req: Request, slug: string): Promise<ProjectRow | Response> {
  const project = await dbFirst<ProjectRow>(
    `SELECT id, slug, visibility, default_locale
     FROM projects
     WHERE slug = ?`,
    [slug],
  );

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.visibility === "private") {
    try {
      await requireSession(req);
    } catch (error) {
      return error as Response;
    }
  }

  return project;
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await requireProjectAccess(req, slug);
  if (access instanceof Response) {
    return access;
  }

  const url = new URL(req.url);
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
  const limit = Math.min(
    250,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10) || 100),
  );
  const offset = page * limit;
  const q = (url.searchParams.get("q") || "").trim();
  const locale = (url.searchParams.get("locale") || access.default_locale).trim().toLowerCase();
  const includeMine = url.searchParams.get("include_mine") === "1";
  const session = includeMine ? await getSession(req) : null;

  if (!/^[a-z]{2}_[a-z]{2}$/.test(locale)) {
    return Response.json({ error: "locale must match xx_xx" }, { status: 400 });
  }

  const filters: string[] = ["ss.project_id = ?", "ss.is_active = 1"];
  const args: unknown[] = [access.id];
  if (q) {
    filters.push("(ss.string_key LIKE ? OR ss.source_text LIKE ?)");
    const like = `%${q}%`;
    args.push(like, like);
  }

  const whereSql = filters.join(" AND ");
  const count = await dbFirst<CountRow>(
    `SELECT COUNT(*) as total
     FROM source_strings ss
     WHERE ${whereSql}`,
    args,
  );

  const mineSql =
    includeMine && session
      ? `,
       (SELECT sg.id
          FROM suggestions sg
         WHERE sg.source_string_id = ss.id
           AND sg.locale = ?
           AND sg.author_discord_id = ?
         ORDER BY sg.created_at DESC
         LIMIT 1) as my_suggestion_id,
       (SELECT sg.locale
          FROM suggestions sg
         WHERE sg.source_string_id = ss.id
           AND sg.locale = ?
           AND sg.author_discord_id = ?
         ORDER BY sg.created_at DESC
         LIMIT 1) as my_suggestion_locale,
       (SELECT sg.text
          FROM suggestions sg
         WHERE sg.source_string_id = ss.id
           AND sg.locale = ?
           AND sg.author_discord_id = ?
         ORDER BY sg.created_at DESC
         LIMIT 1) as my_suggestion_text,
       (SELECT sg.status
          FROM suggestions sg
         WHERE sg.source_string_id = ss.id
           AND sg.locale = ?
           AND sg.author_discord_id = ?
         ORDER BY sg.created_at DESC
         LIMIT 1) as my_suggestion_status,
       (SELECT sg.created_at
          FROM suggestions sg
         WHERE sg.source_string_id = ss.id
           AND sg.locale = ?
           AND sg.author_discord_id = ?
         ORDER BY sg.created_at DESC
         LIMIT 1) as my_suggestion_created_at`
      : `,
       NULL as my_suggestion_id,
       NULL as my_suggestion_locale,
       NULL as my_suggestion_text,
       NULL as my_suggestion_status,
       NULL as my_suggestion_created_at`;

  const mineParams =
    includeMine && session
      ? [
          locale,
          session.sub,
          locale,
          session.sub,
          locale,
          session.sub,
          locale,
          session.sub,
          locale,
          session.sub,
        ]
      : [];

  const rows = await dbAll<StringRow>(
    `SELECT
       ss.id,
       ss.string_key,
       ss.source_text,
       ss.context,
       ss.placeholder_sig,
       ${locale === "en_us" ? "ss.source_text" : "tr.text"} as approved_translation
       ${mineSql}
     FROM source_strings ss
     LEFT JOIN translations tr
       ON tr.source_string_id = ss.id
      AND tr.locale = ?
      AND tr.status = 'approved'
     WHERE ${whereSql}
     ORDER BY ss.string_key ASC
     LIMIT ? OFFSET ?`,
    [locale, ...mineParams, ...args, limit, offset],
  );

  return Response.json({
    ok: true,
    project: access.slug,
    page,
    limit,
    total: count?.total ?? 0,
    locale,
    strings: rows.map((row) => ({
      id: row.id,
      string_key: row.string_key,
      source_text: row.source_text,
      context: row.context,
      placeholder_sig: row.placeholder_sig,
      approved_translation: row.approved_translation,
      my_suggestion: row.my_suggestion_id
        ? {
            id: row.my_suggestion_id,
            locale: row.my_suggestion_locale ?? locale,
            text: row.my_suggestion_text ?? "",
            status: row.my_suggestion_status ?? "pending",
            created_at: row.my_suggestion_created_at ?? "",
          }
        : null,
    })),
  });
}
