-- Seed for local/dev. Safe to run multiple times.

PRAGMA foreign_keys = ON;

-- Example project + target
INSERT OR IGNORE INTO projects (id, slug, name, visibility, default_locale)
VALUES ('proj_demo', 'demo-mod', 'Demo Mod', 'public', 'en_us');

INSERT OR IGNORE INTO targets (id, project_id, key, label)
VALUES ('tgt_demo_latest', 'proj_demo', 'latest', 'Latest');
