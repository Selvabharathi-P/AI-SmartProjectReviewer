import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.evaluation import EvaluationOut, FacultyReview
from app.models.evaluation import Evaluation
from app.models.project import Project, ProjectVersion, ProjectStatus, ReviewStatus
from app.models.user import User, UserRole
from app.core.deps import get_current_user, require_role

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


async def _latest_version_id(project_id: int, db: AsyncSession) -> int | None:
    result = await db.execute(
        select(ProjectVersion.id)
        .where(ProjectVersion.project_id == project_id)
        .order_by(ProjectVersion.version_number.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _eval_for_version(version_id: int, db: AsyncSession) -> Evaluation | None:
    result = await db.execute(select(Evaluation).where(Evaluation.version_id == version_id))
    return result.scalar_one_or_none()


@router.get("/version/{version_id}", response_model=EvaluationOut)
async def get_evaluation_by_version(
    version_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ev = await _eval_for_version(version_id, db)
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not ready yet")
    return _serialize(ev)


@router.get("/{project_id}", response_model=EvaluationOut)
async def get_evaluation(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Backward-compatible: returns the evaluation of the project's latest version."""
    version_id = await _latest_version_id(project_id, db)
    ev = await _eval_for_version(version_id, db) if version_id else None
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not ready yet")
    return _serialize(ev)


@router.patch("/{project_id}/faculty-review", response_model=EvaluationOut)
async def faculty_review(
    project_id: int,
    payload: FacultyReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    version_id = await _latest_version_id(project_id, db)
    ev = await _eval_for_version(version_id, db) if version_id else None
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    ev.faculty_id = current_user.id
    ev.faculty_score = payload.faculty_score
    ev.faculty_remarks = payload.faculty_remarks
    ev.is_finalized = payload.is_finalized

    version = (
        await db.execute(select(ProjectVersion).where(ProjectVersion.id == version_id))
    ).scalar_one_or_none()
    if version:
        # Advance the review status as faculty acts on the submitted version.
        if version.submitted_for_review:
            version.review_status = (
                ReviewStatus.evaluated.value if payload.is_finalized else ReviewStatus.under_review.value
            )
        # Optionally update the reviewed version's project status in the same call
        if payload.project_status:
            try:
                version.status = ProjectStatus(payload.project_status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {payload.project_status}")

    await db.commit()
    await db.refresh(ev)
    return _serialize(ev)


def _serialize(ev: Evaluation) -> dict:
    return {
        "id": ev.id,
        "version_id": ev.version_id,
        "title_score": ev.title_score,
        "description_score": ev.description_score,
        "module_score": ev.module_score,
        "tech_score": ev.tech_score,
        "innovation_score": ev.innovation_score,
        "feasibility_score": ev.feasibility_score,
        "ai_total_score": ev.ai_total_score,
        "ai_feedback": ev.ai_feedback,
        "suggested_modules": json.loads(ev.suggested_modules or "[]"),
        "missing_skills": json.loads(ev.missing_skills or "[]"),
        "keywords": json.loads(ev.keywords or "[]"),
        "related_papers": json.loads(ev.related_papers or "[]"),
        "similar_projects": json.loads(ev.similar_projects or "[]"),
        "originality_verdict": ev.originality_verdict,
        "faculty_score": ev.faculty_score,
        "faculty_remarks": ev.faculty_remarks,
        "is_finalized": ev.is_finalized,
    }
