from pydantic import BaseModel
from typing import List, Optional


class RelatedPaper(BaseModel):
    title: str
    url: str
    snippet: str


class EvaluationOut(BaseModel):
    id: int
    project_id: int
    title_score: float
    description_score: float
    module_score: float
    tech_score: float
    innovation_score: float
    feasibility_score: float
    ai_total_score: float
    ai_feedback: Optional[str]
    suggested_modules: List[str]
    missing_skills: List[str]
    keywords: List[str]
    related_papers: List[RelatedPaper]
    similar_projects: List[RelatedPaper]
    originality_verdict: Optional[str]
    faculty_score: Optional[float]
    faculty_remarks: Optional[str]
    is_finalized: bool

    model_config = {"from_attributes": True}


class FacultyReview(BaseModel):
    faculty_score: float
    faculty_remarks: Optional[str] = None
    is_finalized: bool = True
    project_status: Optional[str] = None  # "selected" | "waiting" | "rejected" | "reviewed"
