-- M3: Submit version for review.
-- Idempotent / additive. Safe to run repeatedly. Mirrors schema_sync.py.
ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS submitted_for_review BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS review_status VARCHAR NOT NULL DEFAULT 'draft';
ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMP;
