import json
from app.ai import scorer, nlp_processor, skill_matcher
from app.ai.mistral_client import chat
from app.ai.serper_client import search_related_work
from app.models.project import Project, ProjectStatus
from app.models.evaluation import Evaluation
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


async def run_ai_evaluation(project: Project, db: AsyncSession) -> Evaluation:
    modules = json.loads(project.modules)
    technologies = json.loads(project.technologies)

    # Compute scores
    scores = {
        "title_score": scorer.score_title(project.title),
        "description_score": scorer.score_description(project.description),
        "module_score": scorer.score_modules(modules),
        "tech_score": scorer.score_technologies(technologies, project.domain),
        "innovation_score": scorer.score_innovation(project.title, project.description),
        "feasibility_score": scorer.score_feasibility(modules, technologies),
    }
    total = scorer.compute_total_score(scores)

    # NLP
    keywords = nlp_processor.extract_keywords(project.title + " " + project.description)
    skill_data = skill_matcher.match_skills(technologies, project.domain)

    # AI feedback via Mistral
    prompt = f"""
Evaluate this final year student project submission:

Title: {project.title}
Description: {project.description}
Modules: {', '.join(modules)}
Technologies: {', '.join(technologies)}
Domain: {project.domain or 'General'}

Provide structured feedback with these sections:
### 1. Detailed Feedback
(3-4 sentences on strengths, technical soundness, and impact)

### 2. Suggested Additional Modules
List 3 specific modules with brief explanations using bullet points.

### 3. Overall Assessment
**Strengths:** (bullet points)
**Areas for Improvement:** (bullet points)
**Final Grade:** (A+/A/A-/B+/B etc with one sentence justification)

Be constructive and academic in tone. Use markdown formatting.
"""
    ai_feedback = chat(prompt)

    # Suggested modules via Mistral
    module_prompt = f"""
For a project titled "{project.title}" with modules: {', '.join(modules)},
suggest 3 additional modules that would strengthen it.
Return ONLY a JSON array of 3 strings like: ["Module 1", "Module 2", "Module 3"]
"""
    try:
        suggested_raw = chat(module_prompt)
        suggested_modules = json.loads(suggested_raw)
    except Exception:
        suggested_modules = ["Testing Module", "Documentation Module", "Deployment Module"]

    # Web search via Serper for related papers and similar projects
    serper_data = search_related_work(project.title, project.domain)
    related_papers = serper_data.get("related_papers", [])
    similar_projects = serper_data.get("similar_projects", [])

    # Ask Mistral to analyze originality based on search results
    originality_verdict = _analyze_originality(project.title, related_papers, similar_projects)

    # Upsert evaluation
    result = await db.execute(select(Evaluation).where(Evaluation.project_id == project.id))
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        evaluation = Evaluation(project_id=project.id)
        db.add(evaluation)

    evaluation.title_score = scores["title_score"]
    evaluation.description_score = scores["description_score"]
    evaluation.module_score = scores["module_score"]
    evaluation.tech_score = scores["tech_score"]
    evaluation.innovation_score = scores["innovation_score"]
    evaluation.feasibility_score = scores["feasibility_score"]
    evaluation.ai_total_score = total
    evaluation.ai_feedback = ai_feedback
    evaluation.suggested_modules = json.dumps(suggested_modules)
    evaluation.missing_skills = json.dumps(skill_data["missing"])
    evaluation.keywords = json.dumps(keywords)
    evaluation.related_papers = json.dumps(related_papers)
    evaluation.similar_projects = json.dumps(similar_projects)
    evaluation.originality_verdict = originality_verdict

    await db.commit()
    await db.refresh(evaluation)

    # Update project status from "analyzing" → "reviewed"
    proj_result = await db.execute(select(Project).where(Project.id == project.id))
    proj = proj_result.scalar_one_or_none()
    if proj and proj.status == ProjectStatus.analyzing:
        proj.status = ProjectStatus.reviewed
        await db.commit()

    return evaluation


def _analyze_originality(title: str, related_papers: list, similar_projects: list) -> str:
    if not related_papers and not similar_projects:
        return "No related work found via web search. Originality could not be assessed — proceed with caution."

    papers_text = "\n".join(
        f"- {p['title']}: {p['snippet']}" for p in related_papers[:4]
    )
    similar_text = "\n".join(
        f"- {p['title']}: {p['snippet']}" for p in similar_projects[:3]
    )

    verdict_prompt = f"""
You are reviewing a student project titled: "{title}"

Related research papers found online:
{papers_text or 'None found'}

Similar published projects found:
{similar_text or 'None found'}

Based on this, provide a brief originality verdict (2-3 sentences) that covers:
1. Whether this project appears to be original or if very similar work already exists
2. Whether the student should continue with this idea or pivot
3. How they can differentiate from existing work

Be direct and concise.
"""
    try:
        return chat(verdict_prompt)
    except Exception:
        return "Originality analysis unavailable."
