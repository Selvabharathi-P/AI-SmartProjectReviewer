import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.project import ProjectSubmit, ProjectOut, ProjectStatusUpdate
from app.models.project import Project, ProjectStatus
from app.models.user import User, UserRole
from app.core.deps import get_current_user, require_role
from app.services.evaluation_service import run_ai_evaluation
from app.services.file_parser import parse_document

ALLOWED_EXTENSIONS = {"pptx", "ppt", "pdf", "docx", "doc"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/parse-document")
async def parse_document_endpoint(
    file: UploadFile = File(...),
    _: User = Depends(require_role(UserRole.student)),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 20 MB.")

    try:
        result = parse_document(file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse document. Try manual entry.")

    return result


@router.post("/", response_model=ProjectOut, status_code=201)
async def submit_project(
    payload: ProjectSubmit,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    project = Project(
        student_id=current_user.id,
        department_id=current_user.department_id,
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
    department_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    query = select(Project)
    if department_id is not None:
        query = query.where(Project.department_id == department_id)
    result = await db.execute(query)
    return [_serialize(p) for p in result.scalars().all()]


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
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
    _: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
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
        "department_id": p.department_id,
        "title": p.title,
        "description": p.description,
        "modules": json.loads(p.modules),
        "technologies": json.loads(p.technologies),
        "team_members": json.loads(p.team_members or "[]"),
        "domain": p.domain,
        "status": p.status,
        "submitted_at": p.submitted_at,
    }
