import logging
from sqlalchemy import text
from app.db.session import engine

logger = logging.getLogger("schema_sync")

# Idempotent, ADDITIVE-ONLY DDL that patches databases created by an older
# version of the app.
#
# Base.metadata.create_all() (run at startup) creates NEW tables but never adds
# columns to tables that already exist and never adds new enum values. So an
# already-running deployment that predates a model change ends up missing those
# columns/values and crashes on startup. Each statement below fills one such gap.
#
# Every statement is safe to run on a brand-new or fully up-to-date database —
# it becomes a no-op (IF NOT EXISTS). When you add a column or enum value to a
# model, append the matching statement here so existing deployments self-heal on
# their next restart.
ADDITIVE_STATEMENTS = (
    "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id)",

    # ── M2: project versioning ──────────────────────────────────
    # projects becomes a container; content moves to project_versions.
    # Legacy projects tables have submitted_at/updated_at but no created_at.
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()",
    """CREATE TABLE IF NOT EXISTS project_versions (
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
    )""",
    # Legacy projects rows keep their content columns; relax NOT NULL so new
    # container-only inserts (which no longer set them) succeed.
    """DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='description') THEN
            ALTER TABLE projects ALTER COLUMN description DROP NOT NULL;
            ALTER TABLE projects ALTER COLUMN modules DROP NOT NULL;
            ALTER TABLE projects ALTER COLUMN technologies DROP NOT NULL;
        END IF;
    END $$""",
    "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS version_id INTEGER REFERENCES project_versions(id)",
    # evaluations.project_id was NOT NULL; new evals key on version_id only.
    """DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='evaluations' AND column_name='project_id') THEN
            ALTER TABLE evaluations ALTER COLUMN project_id DROP NOT NULL;
        END IF;
    END $$""",
    # Backfill: snapshot each legacy project as version 1.
    """DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='description') THEN
            INSERT INTO project_versions
                (project_id, version_number, description, modules, technologies, team_members, domain, status, submitted_at)
            SELECT p.id, 1, p.description, p.modules, p.technologies, p.team_members, p.domain, p.status, p.submitted_at
            FROM projects p
            WHERE NOT EXISTS (SELECT 1 FROM project_versions v WHERE v.project_id = p.id);
        END IF;
    END $$""",
    # Link existing evaluations to the backfilled v1 version.
    """DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='evaluations' AND column_name='project_id') THEN
            UPDATE evaluations e
            SET version_id = v.id
            FROM project_versions v
            WHERE v.project_id = e.project_id AND v.version_number = 1 AND e.version_id IS NULL;
        END IF;
    END $$""",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_evaluations_version_id ON evaluations(version_id)",

    # ── M3: submit version for review ───────────────────────────
    "ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS submitted_for_review BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS review_status VARCHAR NOT NULL DEFAULT 'draft'",
    "ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMP",
)


async def ensure_schema() -> None:
    """Apply idempotent additive schema fixes for pre-existing databases.

    Runs in AUTOCOMMIT because `ALTER TYPE ... ADD VALUE` cannot execute inside a
    transaction block, and so a single failing statement can't abort the rest.
    """
    autocommit_engine = engine.execution_options(isolation_level="AUTOCOMMIT")
    async with autocommit_engine.connect() as conn:
        for stmt in ADDITIVE_STATEMENTS:
            try:
                await conn.execute(text(stmt))
            except Exception as exc:  # noqa: BLE001 — log and keep going
                logger.warning("schema_sync skipped: %s -> %s", stmt, exc)
