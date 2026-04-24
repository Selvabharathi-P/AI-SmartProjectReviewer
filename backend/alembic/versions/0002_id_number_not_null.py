"""make id_number not null

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE users SET id_number = 'UNKNOWN' WHERE id_number IS NULL")
    op.alter_column("users", "id_number", existing_type=sa.String(), nullable=False)


def downgrade():
    op.alter_column("users", "id_number", existing_type=sa.String(), nullable=True)
