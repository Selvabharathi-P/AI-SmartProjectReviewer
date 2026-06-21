-- M1: Admin user management — soft-deactivate support
-- Idempotent, additive. Safe to run on any existing database.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
