"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(), unique=True, nullable=False),
        sa.Column("code", sa.String(20), unique=True, nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), unique=True, index=True, nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.Enum("student", "faculty", "admin", name="userrole"), nullable=False, server_default="student"),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("id_number", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("modules", sa.Text(), nullable=False),
        sa.Column("technologies", sa.Text(), nullable=False),
        sa.Column("team_members", sa.Text(), nullable=True),
        sa.Column("domain", sa.String(), nullable=True),
        sa.Column("status", sa.Enum("pending", "analyzing", "reviewed", "selected", "rejected", "waiting", name="projectstatus"), nullable=True, server_default="pending"),
        sa.Column("submitted_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "evaluations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), unique=True, nullable=False),
        sa.Column("faculty_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("title_score", sa.Float(), nullable=True),
        sa.Column("description_score", sa.Float(), nullable=True),
        sa.Column("module_score", sa.Float(), nullable=True),
        sa.Column("tech_score", sa.Float(), nullable=True),
        sa.Column("innovation_score", sa.Float(), nullable=True),
        sa.Column("feasibility_score", sa.Float(), nullable=True),
        sa.Column("ai_total_score", sa.Float(), nullable=True),
        sa.Column("ai_feedback", sa.Text(), nullable=True),
        sa.Column("suggested_modules", sa.Text(), nullable=True),
        sa.Column("missing_skills", sa.Text(), nullable=True),
        sa.Column("keywords", sa.Text(), nullable=True),
        sa.Column("related_papers", sa.Text(), nullable=True),
        sa.Column("similar_projects", sa.Text(), nullable=True),
        sa.Column("originality_verdict", sa.String(), nullable=True),
        sa.Column("faculty_score", sa.Float(), nullable=True),
        sa.Column("faculty_remarks", sa.Text(), nullable=True),
        sa.Column("is_finalized", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("evaluations")
    op.drop_table("projects")
    op.drop_table("users")
    op.drop_table("departments")
    op.execute("DROP TYPE IF EXISTS projectstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
