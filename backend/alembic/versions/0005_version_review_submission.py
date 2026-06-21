"""submit version for review fields

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("project_versions", sa.Column("submitted_for_review", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("project_versions", sa.Column("review_status", sa.String(), nullable=False, server_default="draft"))
    op.add_column("project_versions", sa.Column("submitted_for_review_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("project_versions", "submitted_for_review_at")
    op.drop_column("project_versions", "review_status")
    op.drop_column("project_versions", "submitted_for_review")
