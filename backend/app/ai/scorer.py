from typing import List
from app.ai.nlp_processor import check_description_quality, extract_keywords
from app.ai.skill_matcher import match_skills, semantic_similarity


def score_title(title: str) -> float:
    """Score title: length, clarity, keywords (0-100)."""
    words = title.split()
    if len(words) < 3:
        return 40.0
    if len(words) > 15:
        return 70.0
    keywords = extract_keywords(title)
    base = min(60 + len(keywords) * 10, 100)
    return float(base)


def score_description(description: str) -> float:
    """Score description quality (0-100)."""
    quality = check_description_quality(description)
    word_count = quality["word_count"]
    if word_count < 30:
        return 30.0
    if word_count < 50:
        return 55.0
    if word_count < 100:
        return 70.0
    if word_count < 200:
        return 85.0
    return 95.0


def score_modules(modules: List[str]) -> float:
    """Score based on number and quality of modules (0-100)."""
    count = len(modules)
    if count == 0:
        return 0.0
    if count < 3:
        return 50.0
    if count < 5:
        return 70.0
    if count < 8:
        return 85.0
    return 95.0


def score_technologies(technologies: List[str], domain: str | None) -> float:
    """Score technology choices and skill coverage (0-100)."""
    skill_data = match_skills(technologies, domain)
    total = len(skill_data["matched"]) + len(skill_data["missing"])
    if total == 0:
        return 50.0
    coverage = len(skill_data["matched"]) / total
    return round(coverage * 100, 2)


def score_innovation(title: str, description: str) -> float:
    """Heuristic innovation score based on semantic novelty keywords (0-100)."""
    innovation_terms = "ai machine learning iot blockchain cloud real-time automation smart intelligent"
    score = semantic_similarity(title + " " + description, innovation_terms)
    return round(min(score * 150, 100), 2)


def score_feasibility(modules: List[str], technologies: List[str]) -> float:
    """Feasibility: balanced ratio of modules vs technologies (0-100)."""
    mod_count = len(modules)
    tech_count = len(technologies)
    if mod_count == 0 or tech_count == 0:
        return 40.0
    ratio = min(mod_count, tech_count) / max(mod_count, tech_count)
    return round(ratio * 100, 2)


def compute_total_score(scores: dict) -> float:
    weights = {
        "title_score": 0.10,
        "description_score": 0.20,
        "module_score": 0.20,
        "tech_score": 0.20,
        "innovation_score": 0.15,
        "feasibility_score": 0.15,
    }
    total = sum(scores[k] * w for k, w in weights.items())
    return round(total, 2)
