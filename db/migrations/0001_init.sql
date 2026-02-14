-- i18n.kaf.sh - D1 migration: initial schema
--
-- Notes:
-- - Uses TEXT timestamps in UTC ISO-ish format via strftime.
-- - Stores tokens hashed (never store raw PATs).
-- - Targets allow per-version catalogs (e.g. "latest", "1.21.11").

PRAGMA foreign_keys = ON;

-- Projects (mods)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public','private')),
  default_locale TEXT NOT NULL DEFAULT 'en_us',

  modrinth_project_id TEXT,
  modrinth_slug TEXT,
  icon_url TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Targets (translation sets per project)
CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT,

  source_revision TEXT,
  source_hash TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, key)
);
CREATE INDEX IF NOT EXISTS idx_targets_project_id ON targets(project_id);

-- Source strings (canonical en_us + placeholder signature)
CREATE TABLE IF NOT EXISTS source_strings (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,

  string_key TEXT NOT NULL,
  source_text TEXT NOT NULL,
  context TEXT,
  placeholder_sig TEXT NOT NULL,

  is_active INTEGER NOT NULL DEFAULT 1,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE,
  UNIQUE(target_id, string_key)
);
CREATE INDEX IF NOT EXISTS idx_source_strings_target_id ON source_strings(target_id);
CREATE INDEX IF NOT EXISTS idx_source_strings_target_key ON source_strings(target_id, string_key);

-- Approved translations (exportable state)
CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  source_string_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved','needs_review')),
  approved_by_discord_id TEXT,
  approved_at TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (source_string_id) REFERENCES source_strings(id) ON DELETE CASCADE,
  UNIQUE(source_string_id, locale)
);
CREATE INDEX IF NOT EXISTS idx_translations_source_string_id ON translations(source_string_id);
CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale);

-- Public suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  source_string_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,

  author_discord_id TEXT NOT NULL,
  author_name TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','rejected','accepted')),
  decided_by_discord_id TEXT,
  decided_at TEXT,
  decision_note TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (source_string_id) REFERENCES source_strings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_suggestions_source_string_id ON suggestions(source_string_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_locale ON suggestions(locale);

-- Trusted approvers
CREATE TABLE IF NOT EXISTS trusted_users (
  discord_id TEXT PRIMARY KEY,
  display_name TEXT,
  added_by_discord_id TEXT,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- PATs: Authorization: Bearer kaf_<token>
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_tokens_disabled ON api_tokens(disabled);
