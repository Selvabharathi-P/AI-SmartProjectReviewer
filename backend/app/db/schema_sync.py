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
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id)",
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
