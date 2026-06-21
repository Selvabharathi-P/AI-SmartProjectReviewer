import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.schemas.project import ProjectSubmit, VersionSubmit, ProjectOut, VersionOut, ProjectStatusUpdate, ReviewQueueItem
from app.models.project import Project, ProjectVersion, ProjectStatus, ReviewStatus
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
    )
    db.add(project)
    await db.flush()  # assign project.id without ending the transaction

    version = ProjectVersion(
        project_id=project.id,
        version_number=1,
        description=payload.description,
        modules=json.dumps(payload.modules),
        technologies=json.dumps(payload.technologies),
        team_members=json.dumps(payload.team_members),
        domain=payload.domain,
        status=ProjectStatus.analyzing,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    await db.refresh(project)

    background_tasks.add_task(run_ai_evaluation, version.id)
    return _serialize_project(project, version, total_versions=1)


@router.post("/{project_id}/versions", response_model=VersionOut, status_code=201)
async def upload_version(
    project_id: int,
    payload: VersionSubmit,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    project = await _get_owned_project(project_id, current_user, db)
    next_number = (await _max_version_number(project_id, db)) + 1

    version = ProjectVersion(
        project_id=project.id,
        version_number=next_number,
        description=payload.description,
        modules=json.dumps(payload.modules),
        technologies=json.dumps(payload.technologies),
        team_members=json.dumps(payload.team_members),
        domain=payload.domain,
        status=ProjectStatus.analyzing,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)

    background_tasks.add_task(run_ai_evaluation, version.id)
    return _serialize_version(version)


@router.post("/{project_id}/versions/{version_id}/submit", response_model=VersionOut)
async def submit_version_for_review(
    project_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    await _get_owned_project(project_id, current_user, db)
    result = await db.execute(
        select(ProjectVersion).where(
            ProjectVersion.id == version_id, ProjectVersion.project_id == project_id
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    if version.submitted_for_review:
        raise HTTPException(status_code=400, detail="This version is already submitted for review")

    version.submitted_for_review = True
    version.review_status = ReviewStatus.submitted.value
    version.submitted_for_review_at = func.now()
    await db.commit()
    await db.refresh(version)
    return _serialize_version(version)


@router.get("/review-queue", response_model=list[ReviewQueueItem])
async def review_queue(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    result = await db.execute(
        select(ProjectVersion, Project, User)
        .join(Project, Project.id == ProjectVersion.project_id)
        .join(User, User.id == Project.student_id)
        .where(ProjectVersion.submitted_for_review.is_(True))
        .order_by(ProjectVersion.submitted_for_review_at.desc())
    )
    items: list[dict] = []
    for version, project, student in result.all():
        items.append({
            "project_id": project.id,
            "version_id": version.id,
            "project_name": project.title,
            "version_number": version.version_number,
            "submitted_by_id": student.id,
            "submitted_by_name": student.full_name,
            "submission_date": version.submitted_for_review_at,
            "review_status": version.review_status,
        })
    return items


@router.get("/my", response_model=list[ProjectOut])
async def my_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    result = await db.execute(select(Project).where(Project.student_id == current_user.id))
    return await _serialize_project_list(result.scalars().all(), db)


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
    return await _serialize_project_list(result.scalars().all(), db)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    project = await _get_project(project_id, db)
    latest = await _latest_version(project_id, db)
    if not latest:
        raise HTTPException(status_code=404, detail="Project has no versions")
    total = await _version_count(project_id, db)
    return _serialize_project(project, latest, total)


@router.get("/{project_id}/versions", response_model=list[VersionOut])
async def list_versions(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await _get_project(project_id, db)
    result = await db.execute(
        select(ProjectVersion)
        .where(ProjectVersion.project_id == project_id)
        .order_by(ProjectVersion.version_number.desc())
    )
    return [_serialize_version(v) for v in result.scalars().all()]


@router.get("/{project_id}/versions/{version_id}", response_model=VersionOut)
async def get_version(
    project_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectVersion).where(
            ProjectVersion.id == version_id, ProjectVersion.project_id == project_id
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return _serialize_version(version)


@router.patch("/{project_id}/status")
async def update_status(
    project_id: int,
    payload: ProjectStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    latest = await _latest_version(project_id, db)
    if not latest:
        raise HTTPException(status_code=404, detail="Project not found")
    latest.status = payload.status
    await db.commit()
    return {"message": "Status updated", "status": payload.status}


# ── helpers ────────────────────────────────────────────────────

async def _get_project(project_id: int, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _get_owned_project(project_id: int, user: User, db: AsyncSession) -> Project:
    project = await _get_project(project_id, db)
    if project.student_id != user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    return project


async def _max_version_number(project_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(ProjectVersion.version_number)).where(ProjectVersion.project_id == project_id)
    )
    return result.scalar() or 0


async def _version_count(project_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(ProjectVersion.id)).where(ProjectVersion.project_id == project_id)
    )
    return result.scalar() or 0


async def _latest_version(project_id: int, db: AsyncSession) -> ProjectVersion | None:
    result = await db.execute(
        select(ProjectVersion)
        .where(ProjectVersion.project_id == project_id)
        .order_by(ProjectVersion.version_number.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _serialize_project_list(projects: list[Project], db: AsyncSession) -> list[dict]:
    out: list[dict] = []
    for p in projects:
        latest = await _latest_version(p.id, db)
        if not latest:
            continue  # container with no versions (shouldn't happen)
        total = await _version_count(p.id, db)
        out.append(_serialize_project(p, latest, total))
    return out


def _serialize_version(v: ProjectVersion) -> dict:
    return {
        "id": v.id,
        "project_id": v.project_id,
        "version_number": v.version_number,
        "description": v.description,
        "modules": json.loads(v.modules),
        "technologies": json.loads(v.technologies),
        "team_members": json.loads(v.team_members or "[]"),
        "domain": v.domain,
        "status": v.status,
        "submitted_at": v.submitted_at,
        "submitted_for_review": v.submitted_for_review,
        "review_status": v.review_status,
        "submitted_for_review_at": v.submitted_for_review_at,
    }


def _serialize_project(p: Project, latest: ProjectVersion, total_versions: int) -> dict:
    return {
        "id": p.id,
        "student_id": p.student_id,
        "department_id": p.department_id,
        "title": p.title,
        "description": latest.description,
        "modules": json.loads(latest.modules),
        "technologies": json.loads(latest.technologies),
        "team_members": json.loads(latest.team_members or "[]"),
        "domain": latest.domain,
        "status": latest.status,
        "submitted_at": latest.submitted_at,
        "latest_version_id": latest.id,
        "version_number": latest.version_number,
        "total_versions": total_versions,
    }
