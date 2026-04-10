import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.project import ProjectSubmit, ProjectOut, ProjectStatusUpdate
from app.models.project import Project, ProjectStatus
from app.models.user import User, UserRole
from app.core.deps import get_current_user, require_role
from app.services.evaluation_service import run_ai_evaluation

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectOut, status_code=201)
async def submit_project(
    payload: ProjectSubmit,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    project = Project(
        student_id=current_user.id,
        title=payload.title,
        description=payload.description,
        modules=json.dumps(payload.modules),
        technologies=json.dumps(payload.technologies),
        team_members=json.dumps(payload.team_members),
        domain=payload.domain,
        status=ProjectStatus.analyzing,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    background_tasks.add_task(run_ai_evaluation, project, db)
    return _serialize(project)


@router.get("/my", response_model=list[ProjectOut])
async def my_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    result = await db.execute(select(Project).where(Project.student_id == current_user.id))
    return [_serialize(p) for p in result.scalars().all()]


@router.get("/", response_model=list[ProjectOut])
async def all_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    result = await db.execute(select(Project))
    return [_serialize(p) for p in result.scalars().all()]


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _serialize(project)


@router.patch("/{project_id}/status")
async def update_status(
    project_id: int,
    payload: ProjectStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = payload.status
    await db.commit()
    return {"message": "Status updated", "status": payload.status}


def _serialize(p: Project) -> dict:
    return {
        "id": p.id,
        "student_id": p.student_id,
        "title": p.title,
        "description": p.description,
        "modules": json.loads(p.modules),
        "technologies": json.loads(p.technologies),
        "team_members": json.loads(p.team_members or "[]"),
        "domain": p.domain,
        "status": p.status,
        "submitted_at": p.submitted_at,
    }
