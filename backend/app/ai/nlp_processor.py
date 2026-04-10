import spacy
from typing import List

nlp = spacy.load("en_core_web_sm")

TECH_KEYWORDS = {
    "python", "java", "javascript", "react", "nextjs", "django", "fastapi",
    "node", "mongodb", "postgresql", "mysql", "tensorflow", "pytorch",
    "machine learning", "deep learning", "nlp", "computer vision",
    "docker", "kubernetes", "aws", "azure", "flutter", "android", "ios",
    "blockchain", "iot", "cloud", "microservices", "rest api", "graphql",
}


def extract_keywords(text: str) -> List[str]:
    doc = nlp(text.lower())
    keywords = []
    for chunk in doc.noun_chunks:
        kw = chunk.text.strip()
        if len(kw) > 2:
            keywords.append(kw)
    for token in doc:
        if token.text in TECH_KEYWORDS:
            keywords.append(token.text)
    return list(set(keywords))


def extract_technologies(text: str) -> List[str]:
    text_lower = text.lower()
    return [tech for tech in TECH_KEYWORDS if tech in text_lower]


def check_description_quality(description: str) -> dict:
    doc = nlp(description)
    sentences = list(doc.sents)
    word_count = len([t for t in doc if not t.is_punct])
    return {
        "word_count": word_count,
        "sentence_count": len(sentences),
        "is_adequate": word_count >= 50,
    }
