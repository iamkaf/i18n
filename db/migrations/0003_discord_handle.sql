PRAGMA foreign_keys = ON;

ALTER TABLE trusted_users ADD COLUMN discord_handle TEXT;

CREATE INDEX IF NOT EXISTS idx_trusted_users_discord_handle ON trusted_users(discord_handle);
