import json
import urllib.request
import urllib.error
from app.core.config import settings


def search_papers(query: str, num: int = 5) -> list[dict]:
    """Search Google via Serper.dev and return organic results."""
    if not settings.SERPER_API_KEY:
        return []

    payload = json.dumps({"q": query, "num": num}).encode("utf-8")
    req = urllib.request.Request(
        "https://google.serper.dev/search",
        data=payload,
        headers={
            "X-API-KEY": settings.SERPER_API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = []
            for item in data.get("organic", [])[:num]:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                })
            return results
    except Exception:
        return []


def search_related_work(title: str, domain: str | None) -> dict:
    """Search for related papers and similar projects for a given project."""
    domain_str = domain or "computer science"

    paper_results = search_papers(f"{title} research paper {domain_str}", num=4)
    similar_results = search_papers(f"{title} project github similar published", num=3)

    return {
        "related_papers": paper_results,
        "similar_projects": similar_results,
    }
