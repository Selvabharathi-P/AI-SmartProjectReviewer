from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, ARRAY, func
from app.db.base import Base
import enum


class ProjectStatus(str, enum.Enum):
    pending = "pending"
    analyzing = "analyzing"
    reviewed = "reviewed"
    selected = "selected"
    rejected = "rejected"
    waiting = "waiting"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    modules = Column(Text, nullable=False)          # JSON string
    technologies = Column(Text, nullable=False)     # JSON string
    team_members = Column(Text, nullable=True)      # JSON string
    domain = Column(String, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.pending)
    submitted_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
