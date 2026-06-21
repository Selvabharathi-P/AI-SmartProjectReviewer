-- M2: Project versioning — projects becomes a container, content moves to
-- project_versions, evaluations re-key from project_id -> version_id.
-- Idempotent / additive. Safe to run repeatedly on an existing database.
-- NOTE: unlike the Alembic migration, this keeps the legacy projects content
-- columns in place (only relaxes NOT NULL) so the running app's create_all path
-- and this patch path agree. Mirrors backend/app/db/schema_sync.py.

-- Legacy projects tables have submitted_at/updated_at but no created_at.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();

CREATE TABLE IF NOT EXISTS project_versions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    version_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    modules TEXT NOT NULL,
    technologies TEXT NOT NULL,
    team_members TEXT,
    domain VARCHAR,
    status projectstatus DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP,
    CONSTRAINT uq_project_version UNIQUE (project_id, version_number)
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='projects' AND column_name='description') THEN
        ALTER TABLE projects ALTER COLUMN description DROP NOT NULL;
        ALTER TABLE projects ALTER COLUMN modules DROP NOT NULL;
        ALTER TABLE projects ALTER COLUMN technologies DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS version_id INTEGER REFERENCES project_versions(id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='evaluations' AND column_name='project_id') THEN
        ALTER TABLE evaluations ALTER COLUMN project_id DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='projects' AND column_name='description') THEN
        INSERT INTO project_versions
            (project_id, version_number, description, modules, technologies, team_members, domain, status, submitted_at)
        SELECT p.id, 1, p.description, p.modules, p.technologies, p.team_members, p.domain, p.status, p.submitted_at
        FROM projects p
        WHERE NOT EXISTS (SELECT 1 FROM project_versions v WHERE v.project_id = p.id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='evaluations' AND column_name='project_id') THEN
        UPDATE evaluations e
        SET version_id = v.id
        FROM project_versions v
        WHERE v.project_id = e.project_id AND v.version_number = 1 AND e.version_id IS NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_evaluations_version_id ON evaluations(version_id);
