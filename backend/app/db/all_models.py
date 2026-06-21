# Import all models here so Alembic can detect them for migrations
from app.models.department import Department  # noqa
from app.models.user import User  # noqa
from app.models.project import Project, ProjectVersion  # noqa
from app.models.evaluation import Evaluation  # noqa
from app.models.meeting import Meeting, MeetingInvitee, MeetingAttendance  # noqa
