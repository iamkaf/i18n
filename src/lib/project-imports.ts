import { getDB } from "@/lib/db";
import { computePlaceholderSig } from "@/lib/placeholders";

export type CatalogInputString = {
  key: string;
  text: string;
  context?: string;
};

export type CatalogUpsertPayload = {
  mod: {
    slug: string;
    name: string;
    visibility?: "public" | "private";
    modrinth?: { projectId?: string; slug?: string; iconUrl?: string };
    githubRepoUrl?: string | null;
  };
  locale: string;
  source?: {
    revision?: string;
    hash?: string;
    path?: string;
  };
  strings: CatalogInputString[];
};

export type ProjectImportResult = {
  ok: true;
  locale: string;
  mode: "source" | "translation";
  imported: number;
  updated: number;
  deactivated: number;
  skipped_unmatched: Array<{ key: string }>;
  ignored_non_string: number;
  source_path?: string | null;
};

type ExistingSourceRow = {
  id: string;
  string_key: string;
  is_active: number;
};

type ExistingTranslationRow = {
  source_string_id: string;
};

type ActiveSourceRow = {
  id: string;
  string_key: string;
};

function normalizeLocale(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeVisibility(value: string | undefined): "public" | "private" {
  return value === "public" ? "public" : "private";
}

export function flattenLocaleObject(input: unknown): {
  strings: CatalogInputString[];
  ignoredNonString: number;
} {
  const strings: CatalogInputString[] = [];
  let ignoredNonString = 0;

  function visit(node: unknown, prefix: string) {
    if (typeof node === "string") {
      strings.push({ key: prefix, text: node });
      return;
    }
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      ignoredNonString += 1;
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      visit(value, nextPrefix);
    }
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Catalog JSON must be an object");
  }

  for (const [key, value] of Object.entries(input)) {
    visit(value, key);
  }

  return { strings, ignoredNonString };
}

async function ensureProject(input: CatalogUpsertPayload["mod"]): Promise<{ id: string; slug: string }> {
  const db = getDB();
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO projects (id, slug, name, visibility, default_locale, modrinth_project_id, modrinth_slug, icon_url, github_repo_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'en_us', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         visibility = excluded.visibility,
         modrinth_project_id = COALESCE(excluded.modrinth_project_id, projects.modrinth_project_id),
         modrinth_slug = COALESCE(excluded.modrinth_slug, projects.modrinth_slug),
         icon_url = COALESCE(excluded.icon_url, projects.icon_url),
         github_repo_url = COALESCE(excluded.github_repo_url, projects.github_repo_url),
         updated_at = excluded.updated_at`,
    )
    .bind(
      projectId,
      input.slug,
      input.name,
      normalizeVisibility(input.visibility),
      input.modrinth?.projectId ?? null,
      input.modrinth?.slug ?? null,
      input.modrinth?.iconUrl ?? null,
      input.githubRepoUrl ?? null,
      now,
      now,
    )
    .run();

  const project = await db
    .prepare(`SELECT id, slug FROM projects WHERE slug = ?`)
    .bind(input.slug)
    .first<{ id: string; slug: string }>();

  if (!project) {
    throw new Error("Failed to upsert project");
  }

  return project;
}

async function importSourceCatalog(input: {
  projectId: string;
  locale: string;
  strings: CatalogInputString[];
  sourcePath?: string | null;
  ignoredNonString?: number;
}): Promise<ProjectImportResult> {
  const db = getDB();
  const now = new Date().toISOString();
  const existing = await db
    .prepare(
      `SELECT id, string_key, is_active
       FROM source_strings
       WHERE project_id = ?`,
    )
    .bind(input.projectId)
    .all<ExistingSourceRow>();
  const rows = existing.results ?? [];
  const existingByKey = new Map(rows.map((row) => [row.string_key, row]));
  const activeKeys = new Set(rows.filter((row) => row.is_active === 1).map((row) => row.string_key));
  const nextKeys = new Set(input.strings.map((entry) => entry.key));
  const deactivated = [...activeKeys].filter((key) => !nextKeys.has(key)).length;

  await db
    .prepare(
      `UPDATE source_strings
       SET is_active = 0, updated_at = ?
       WHERE project_id = ?`,
    )
    .bind(now, input.projectId)
    .run();

  let imported = 0;
  let updated = 0;

  const statements = input.strings.map((entry) => {
    const current = existingByKey.get(entry.key);
    if (current) {
      updated += 1;
    } else {
      imported += 1;
    }
    return db
      .prepare(
        `INSERT INTO source_strings (id, project_id, string_key, source_text, context, placeholder_sig, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(project_id, string_key) DO UPDATE SET
           source_text = excluded.source_text,
           context = excluded.context,
           placeholder_sig = excluded.placeholder_sig,
           is_active = 1,
           updated_at = excluded.updated_at`,
      )
      .bind(
        current?.id ?? crypto.randomUUID(),
        input.projectId,
        entry.key,
        entry.text,
        entry.context ?? null,
        computePlaceholderSig(entry.text),
        now,
        now,
      );
  });

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return {
    ok: true,
    locale: input.locale,
    mode: "source",
    imported,
    updated,
    deactivated,
    skipped_unmatched: [],
    ignored_non_string: input.ignoredNonString ?? 0,
    source_path: input.sourcePath ?? null,
  };
}

async function importApprovedTranslations(input: {
  projectId: string;
  locale: string;
  strings: CatalogInputString[];
  sourcePath?: string | null;
  ignoredNonString?: number;
}): Promise<ProjectImportResult> {
  const db = getDB();
  const now = new Date().toISOString();
  const activeSources = await db
    .prepare(
      `SELECT id, string_key
       FROM source_strings
       WHERE project_id = ? AND is_active = 1`,
    )
    .bind(input.projectId)
    .all<ActiveSourceRow>();
  const sourceByKey = new Map((activeSources.results ?? []).map((row) => [row.string_key, row]));
  const activeSourceIds = [...sourceByKey.values()].map((row) => row.id);

  const existingTranslations = activeSourceIds.length
    ? await db
        .prepare(
          `SELECT tr.source_string_id
           FROM translations tr
           JOIN source_strings ss ON ss.id = tr.source_string_id
           WHERE ss.project_id = ? AND tr.locale = ?`,
        )
        .bind(input.projectId, input.locale)
        .all<ExistingTranslationRow>()
    : { results: [] as ExistingTranslationRow[] };

  const existingBySourceId = new Set((existingTranslations.results ?? []).map((row) => row.source_string_id));

  let imported = 0;
  let updated = 0;
  const skipped_unmatched: Array<{ key: string }> = [];
  const statements: D1PreparedStatement[] = [];

  for (const entry of input.strings) {
    const source = sourceByKey.get(entry.key);
    if (!source) {
      skipped_unmatched.push({ key: entry.key });
      continue;
    }

    if (existingBySourceId.has(source.id)) {
      updated += 1;
    } else {
      imported += 1;
    }

    statements.push(
      db
        .prepare(
          `INSERT INTO translations (id, source_string_id, locale, text, status, approved_by_discord_id, approved_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'approved', NULL, ?, ?, ?)
           ON CONFLICT(source_string_id, locale) DO UPDATE SET
             text = excluded.text,
             status = 'approved',
             approved_by_discord_id = NULL,
             approved_at = excluded.approved_at,
             updated_at = excluded.updated_at`,
        )
        .bind(
          crypto.randomUUID(),
          source.id,
          input.locale,
          entry.text,
          now,
          now,
          now,
        ),
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return {
    ok: true,
    locale: input.locale,
    mode: "translation",
    imported,
    updated,
    deactivated: 0,
    skipped_unmatched,
    ignored_non_string: input.ignoredNonString ?? 0,
    source_path: input.sourcePath ?? null,
  };
}

export async function upsertProjectLocaleCatalog(
  payload: CatalogUpsertPayload,
): Promise<ProjectImportResult> {
  const locale = normalizeLocale(payload.locale);
  if (!/^[a-z]{2}_[a-z]{2}$/.test(locale)) {
    throw new Error("locale must match xx_xx");
  }

  const project = await ensureProject(payload.mod);
  if (locale === "en_us") {
    return importSourceCatalog({
      projectId: project.id,
      locale,
      strings: payload.strings,
      sourcePath: payload.source?.path ?? null,
    });
  }

  return importApprovedTranslations({
    projectId: project.id,
    locale,
    strings: payload.strings,
    sourcePath: payload.source?.path ?? null,
  });
}

export async function importLocaleIntoExistingProject(input: {
  project: {
    id: string;
    slug: string;
    name: string;
    visibility: "public" | "private";
    modrinth_project_id?: string | null;
    modrinth_slug?: string | null;
    icon_url?: string | null;
    github_repo_url?: string | null;
  };
  locale: string;
  strings: CatalogInputString[];
  sourcePath?: string | null;
  ignoredNonString?: number;
}): Promise<ProjectImportResult> {
  const locale = normalizeLocale(input.locale);
  if (locale === "en_us") {
    return importSourceCatalog({
      projectId: input.project.id,
      locale,
      strings: input.strings,
      sourcePath: input.sourcePath,
      ignoredNonString: input.ignoredNonString,
    });
  }
  return importApprovedTranslations({
    projectId: input.project.id,
    locale,
    strings: input.strings,
    sourcePath: input.sourcePath,
    ignoredNonString: input.ignoredNonString,
  });
}
