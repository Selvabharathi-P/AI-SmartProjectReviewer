from pydantic import BaseModel
from app.models.project import ProjectStatus
from datetime import datetime
from typing import List


class ProjectSubmit(BaseModel):
    title: str
    description: str
    modules: List[str]
    technologies: List[str]
    team_members: List[str] = []
    domain: str | None = None


class ProjectOut(BaseModel):
    id: int
    student_id: int
    title: str
    description: str
    modules: List[str]
    technologies: List[str]
    team_members: List[str]
    domain: str | None
    status: ProjectStatus
    submitted_at: datetime

    model_config = {"from_attributes": True}


class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus
