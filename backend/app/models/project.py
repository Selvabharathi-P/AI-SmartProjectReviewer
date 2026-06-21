from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, Boolean, UniqueConstraint, func
from app.db.base import Base
import enum


class ProjectStatus(str, enum.Enum):
    pending = "pending"
    analyzing = "analyzing"
    reviewed = "reviewed"
    selected = "selected"
    rejected = "rejected"
    waiting = "waiting"


class ReviewStatus(str, enum.Enum):
    draft = "draft"            # not yet submitted for review
    submitted = "submitted"    # student submitted this version for review
    under_review = "under_review"
    evaluated = "evaluated"    # faculty finalized the evaluation


class Project(Base):
    """Container for a logical project. Content lives on ProjectVersion."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class ProjectVersion(Base):
    """One uploaded submission of a project. Each version is evaluated on its own."""
    __tablename__ = "project_versions"
    __table_args__ = (UniqueConstraint("project_id", "version_number", name="uq_project_version"),)

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    modules = Column(Text, nullable=False)          # JSON string
    technologies = Column(Text, nullable=False)     # JSON string
    team_members = Column(Text, nullable=True)      # JSON string
    domain = Column(String, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.pending)
    submitted_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # review submission (M3) — review_status held as a plain string, values from ReviewStatus
    submitted_for_review = Column(Boolean, nullable=False, server_default="false")
    review_status = Column(String, nullable=False, server_default=ReviewStatus.draft.value)
    submitted_for_review_at = Column(DateTime, nullable=True)
