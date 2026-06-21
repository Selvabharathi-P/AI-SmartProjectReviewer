from pydantic import BaseModel
from app.models.project import ProjectStatus
from datetime import datetime
from typing import List, Optional


class ProjectSubmit(BaseModel):
    """Create a new project (container) + its first version."""
    title: str
    description: str
    modules: List[str]
    technologies: List[str]
    team_members: List[str] = []
    domain: str | None = None


class VersionSubmit(BaseModel):
    """Upload a new version of an existing project."""
    description: str
    modules: List[str]
    technologies: List[str]
    team_members: List[str] = []
    domain: str | None = None


class VersionOut(BaseModel):
    id: int
    project_id: int
    version_number: int
    description: str
    modules: List[str]
    technologies: List[str]
    team_members: List[str]
    domain: str | None
    status: ProjectStatus
    submitted_at: datetime
    submitted_for_review: bool
    review_status: str
    submitted_for_review_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ReviewQueueItem(BaseModel):
    """A version submitted for review, for the faculty review queue."""
    project_id: int
    version_id: int
    project_name: str
    version_number: int
    submitted_by_id: int
    submitted_by_name: str
    submission_date: Optional[datetime]
    review_status: str


class ProjectOut(BaseModel):
    """A project flattened with its latest version's content (backward compatible)."""
    id: int                         # container id
    student_id: int
    department_id: int | None
    title: str
    description: str
    modules: List[str]
    technologies: List[str]
    team_members: List[str]
    domain: str | None
    status: ProjectStatus
    submitted_at: datetime
    # version metadata
    latest_version_id: int
    version_number: int
    total_versions: int

    model_config = {"from_attributes": True}


class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus
