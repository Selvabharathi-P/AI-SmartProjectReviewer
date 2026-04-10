from sentence_transformers import SentenceTransformer, util
from typing import List
import torch

_model = SentenceTransformer("all-MiniLM-L6-v2")

DOMAIN_SKILLS = {
    "web": ["html", "css", "javascript", "react", "nextjs", "nodejs", "rest api", "database"],
    "ml_ai": ["python", "tensorflow", "pytorch", "scikit-learn", "nlp", "data preprocessing", "model training"],
    "mobile": ["flutter", "android", "ios", "react native", "dart", "kotlin", "swift"],
    "iot": ["arduino", "raspberry pi", "sensors", "mqtt", "embedded systems"],
    "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "ci/cd"],
    "blockchain": ["solidity", "ethereum", "smart contracts", "web3", "decentralized"],
}


def match_skills(technologies: List[str], domain: str | None) -> dict:
    tech_str = " ".join(technologies).lower()
    matched = []
    missing = []

    if domain and domain.lower() in DOMAIN_SKILLS:
        required = DOMAIN_SKILLS[domain.lower()]
        for skill in required:
            if skill in tech_str:
                matched.append(skill)
            else:
                missing.append(skill)
    else:
        # Semantic matching against all domains
        tech_embedding = _model.encode(tech_str, convert_to_tensor=True)
        best_score = 0
        best_domain = "web"
        for d, skills in DOMAIN_SKILLS.items():
            domain_str = " ".join(skills)
            domain_embedding = _model.encode(domain_str, convert_to_tensor=True)
            score = float(util.cos_sim(tech_embedding, domain_embedding))
            if score > best_score:
                best_score = score
                best_domain = d
        required = DOMAIN_SKILLS[best_domain]
        for skill in required:
            if skill in tech_str:
                matched.append(skill)
            else:
                missing.append(skill)

    return {"matched": matched, "missing": missing}


def semantic_similarity(text1: str, text2: str) -> float:
    emb1 = _model.encode(text1, convert_to_tensor=True)
    emb2 = _model.encode(text2, convert_to_tensor=True)
    return float(util.cos_sim(emb1, emb2))
