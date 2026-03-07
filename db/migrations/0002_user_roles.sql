PRAGMA foreign_keys = ON;

ALTER TABLE trusted_users ADD COLUMN role TEXT NOT NULL DEFAULT 'trusted'
  CHECK (role IN ('trusted', 'god'));

CREATE INDEX IF NOT EXISTS idx_trusted_users_role ON trusted_users(role);
