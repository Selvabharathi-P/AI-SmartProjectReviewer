import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.evaluation import EvaluationOut, FacultyReview
from app.models.evaluation import Evaluation
from app.models.project import Project, ProjectStatus
from app.models.user import User, UserRole
from app.core.deps import get_current_user, require_role

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.get("/{project_id}", response_model=EvaluationOut)
async def get_evaluation(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Evaluation).where(Evaluation.project_id == project_id))
    ev = result.scalar_one_or_none()
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
    result = await db.execute(select(Evaluation).where(Evaluation.project_id == project_id))
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    ev.faculty_id = current_user.id
    ev.faculty_score = payload.faculty_score
    ev.faculty_remarks = payload.faculty_remarks
    ev.is_finalized = payload.is_finalized

    # Optionally update project status in the same call
    if payload.project_status:
        try:
            new_status = ProjectStatus(payload.project_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {payload.project_status}")
        proj_result = await db.execute(select(Project).where(Project.id == project_id))
        proj = proj_result.scalar_one_or_none()
        if proj:
            proj.status = new_status

    await db.commit()
    await db.refresh(ev)
    return _serialize(ev)


def _serialize(ev: Evaluation) -> dict:
    return {
        "id": ev.id,
        "project_id": ev.project_id,
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
