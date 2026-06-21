from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, Float, UniqueConstraint, func
from app.db.base import Base
import enum


class MeetingStatus(str, enum.Enum):
    upcoming = "upcoming"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    topic = Column(String, nullable=False)
    agenda = Column(Text, nullable=True)
    scheduled_start = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False, server_default="60")
    status = Column(Enum(MeetingStatus), default=MeetingStatus.upcoming, nullable=False)

    # Zoom linkage
    zoom_meeting_id = Column(String, nullable=True, index=True)
    join_url = Column(String, nullable=True)
    start_url = Column(Text, nullable=True)   # host start url (long, sensitive)

    created_at = Column(DateTime, server_default=func.now())


class MeetingInvitee(Base):
    __tablename__ = "meeting_invitees"
    __table_args__ = (UniqueConstraint("meeting_id", "student_id", name="uq_meeting_invitee"),)

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)


class MeetingAttendance(Base):
    """Attendance for one participant in one meeting. Sourced from Zoom webhooks
    (or app-side join/leave fallback). student_id is null when a Zoom participant
    can't be matched to an invited student by email."""
    __tablename__ = "meeting_attendance"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    participant_email = Column(String, nullable=True)
    participant_name = Column(String, nullable=True)
    zoom_participant_uuid = Column(String, nullable=True, index=True)

    join_time = Column(DateTime, nullable=True)
    leave_time = Column(DateTime, nullable=True)
    attendance_duration_sec = Column(Integer, nullable=False, server_default="0")
    presentation_duration_sec = Column(Integer, nullable=False, server_default="0")

    # transient: when a screen-share started (cleared when it ends)
    presentation_started_at = Column(DateTime, nullable=True)

    source = Column(String, nullable=False, server_default="zoom")  # "zoom" | "app"
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
