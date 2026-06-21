"""meetings, invitees, attendance (Zoom)

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

MEETING_STATUS = sa.Enum("upcoming", "active", "completed", "cancelled", name="meetingstatus")


def upgrade():
    op.create_table(
        "meetings",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("topic", sa.String(), nullable=False),
        sa.Column("agenda", sa.Text(), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("status", MEETING_STATUS, nullable=False, server_default="upcoming"),
        sa.Column("zoom_meeting_id", sa.String(), nullable=True, index=True),
        sa.Column("join_url", sa.String(), nullable=True),
        sa.Column("start_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_table(
        "meeting_invitees",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("meeting_id", sa.Integer(), sa.ForeignKey("meetings.id"), nullable=False, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.UniqueConstraint("meeting_id", "student_id", name="uq_meeting_invitee"),
    )
    op.create_table(
        "meeting_attendance",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("meeting_id", sa.Integer(), sa.ForeignKey("meetings.id"), nullable=False, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("participant_email", sa.String(), nullable=True),
        sa.Column("participant_name", sa.String(), nullable=True),
        sa.Column("zoom_participant_uuid", sa.String(), nullable=True, index=True),
        sa.Column("join_time", sa.DateTime(), nullable=True),
        sa.Column("leave_time", sa.DateTime(), nullable=True),
        sa.Column("attendance_duration_sec", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("presentation_duration_sec", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("presentation_started_at", sa.DateTime(), nullable=True),
        sa.Column("source", sa.String(), nullable=False, server_default="zoom"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("meeting_attendance")
    op.drop_table("meeting_invitees")
    op.drop_table("meetings")
    op.execute("DROP TYPE IF EXISTS meetingstatus")
