from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.models.meeting import MeetingStatus


class MeetingCreate(BaseModel):
    topic: str
    agenda: str | None = None
    scheduled_start: datetime
    duration_minutes: int = 60
    department_id: int | None = None
    invitee_ids: List[int] = []


class MeetingOut(BaseModel):
    id: int
    reviewer_id: int
    department_id: int | None
    topic: str
    agenda: str | None
    scheduled_start: datetime
    duration_minutes: int
    status: MeetingStatus
    zoom_meeting_id: str | None
    join_url: str | None
    start_url: str | None = None      # host url — only populated for the reviewer
    invitee_count: int = 0
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AttendanceOut(BaseModel):
    id: int
    meeting_id: int
    student_id: int | None
    participant_name: str | None
    participant_email: str | None
    join_time: Optional[datetime]
    leave_time: Optional[datetime]
    attendance_duration_sec: int
    presentation_duration_sec: int
    source: str

    model_config = {"from_attributes": True}
