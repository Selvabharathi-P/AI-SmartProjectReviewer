"""project versioning: projects -> container + project_versions

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

PROJECT_STATUS = sa.Enum(
    "pending", "analyzing", "reviewed", "selected", "rejected", "waiting",
    name="projectstatus",
)


def upgrade():
    # 1. New versions table (reuse existing projectstatus enum).
    op.create_table(
        "project_versions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("modules", sa.Text(), nullable=False),
        sa.Column("technologies", sa.Text(), nullable=False),
        sa.Column("team_members", sa.Text(), nullable=True),
        sa.Column("domain", sa.String(), nullable=True),
        sa.Column("status", PROJECT_STATUS, server_default="pending", create_type=False),
        sa.Column("submitted_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("project_id", "version_number", name="uq_project_version"),
    )

    # 2. Backfill: each existing project becomes version 1.
    op.execute(
        """
        INSERT INTO project_versions
            (project_id, version_number, description, modules, technologies, team_members, domain, status, submitted_at)
        SELECT p.id, 1, p.description, p.modules, p.technologies, p.team_members, p.domain, p.status, p.submitted_at
        FROM projects p
        """
    )

    # 3. Repoint evaluations from project_id -> version_id.
    op.add_column("evaluations", sa.Column("version_id", sa.Integer(), sa.ForeignKey("project_versions.id"), nullable=True))
    op.execute(
        """
        UPDATE evaluations e
        SET version_id = v.id
        FROM project_versions v
        WHERE v.project_id = e.project_id AND v.version_number = 1
        """
    )
    op.create_unique_constraint("uq_evaluations_version_id", "evaluations", ["version_id"])
    op.drop_column("evaluations", "project_id")

    # 4. projects is now a pure container — drop content columns.
    op.drop_column("projects", "description")
    op.drop_column("projects", "modules")
    op.drop_column("projects", "technologies")
    op.drop_column("projects", "team_members")
    op.drop_column("projects", "domain")
    op.drop_column("projects", "status")
    op.drop_column("projects", "submitted_at")
    op.drop_column("projects", "updated_at")


def downgrade():
    op.add_column("projects", sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.add_column("projects", sa.Column("submitted_at", sa.DateTime(), server_default=sa.func.now()))
    op.add_column("projects", sa.Column("status", PROJECT_STATUS, server_default="pending", create_type=False))
    op.add_column("projects", sa.Column("domain", sa.String(), nullable=True))
    op.add_column("projects", sa.Column("team_members", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("technologies", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("modules", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("description", sa.Text(), nullable=True))
    op.execute(
        """
        UPDATE projects p
        SET description = v.description, modules = v.modules, technologies = v.technologies,
            team_members = v.team_members, domain = v.domain, status = v.status, submitted_at = v.submitted_at
        FROM project_versions v
        WHERE v.project_id = p.id AND v.version_number = 1
        """
    )

    op.add_column("evaluations", sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=True))
    op.execute(
        """
        UPDATE evaluations e
        SET project_id = v.project_id
        FROM project_versions v
        WHERE v.id = e.version_id
        """
    )
    op.drop_constraint("uq_evaluations_version_id", "evaluations", type_="unique")
    op.drop_column("evaluations", "version_id")
    op.drop_table("project_versions")
