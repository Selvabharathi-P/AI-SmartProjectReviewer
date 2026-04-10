from sqlalchemy import Column, Integer, Float, Text, ForeignKey, DateTime, func, Boolean
from app.db.base import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, nullable=False)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # AI Scores (0-100)
    title_score = Column(Float, default=0)
    description_score = Column(Float, default=0)
    module_score = Column(Float, default=0)
    tech_score = Column(Float, default=0)
    innovation_score = Column(Float, default=0)
    feasibility_score = Column(Float, default=0)
    ai_total_score = Column(Float, default=0)

    # AI feedback
    ai_feedback = Column(Text, nullable=True)
    suggested_modules = Column(Text, nullable=True)   # JSON
    missing_skills = Column(Text, nullable=True)      # JSON
    keywords = Column(Text, nullable=True)            # JSON

    # Web search results (Serper)
    related_papers = Column(Text, nullable=True)    # JSON
    similar_projects = Column(Text, nullable=True)  # JSON
    originality_verdict = Column(Text, nullable=True)

    # Faculty override
    faculty_score = Column(Float, nullable=True)
    faculty_remarks = Column(Text, nullable=True)
    is_finalized = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
