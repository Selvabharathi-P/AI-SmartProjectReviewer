# Presentation Guide — SmartEval

> Use this as your slide-by-slide script, speaker notes, and demo walkthrough.

---

## Slide 1 — Title

**SmartEval**  
_AI-Powered Final Year Project Evaluation System_

> Brief: State your name, project title, and one-line pitch.  
> **Pitch:** "SmartEval replaces manual project screening with an AI pipeline that scores, critiques, and researches every student project in seconds — giving faculty structured insights instead of raw submissions."

---

## Slide 2 — Problem Statement

**The Problem**
- Hundreds of final-year projects submitted each semester
- Faculty manually review each: time-consuming, inconsistent, subjective
- Students get minimal structured feedback — just a pass/fail
- No automatic check for project originality or skill gaps

**The Gap**
> Existing systems are submission portals, not evaluation engines.

---

## Slide 3 — Solution Overview

**SmartEval = Submission Portal + AI Evaluation Engine + Faculty Review Tool**

| Who | What they get |
|---|---|
| Students | Instant AI feedback, scores, skill gaps, research links |
| Faculty | Pre-analyzed projects, radar charts, one-click decisions |
| Institution | Consistent, traceable, data-backed evaluation |

---

## Slide 4 — Key Features

1. **Multi-criteria AI Scoring** — 6 dimensions, each 0–100, weighted total
2. **Mistral AI Feedback** — Natural language narrative with specific suggestions
3. **Skill Gap Analysis** — Missing technologies detected via Sentence Transformers
4. **Web Research** — Related papers and similar projects auto-fetched (Serper API)
5. **Originality Verdict** — AI-assessed uniqueness of the project
6. **Faculty Review Workflow** — Score override, remarks, Select/Waitlist/Reject
7. **Real-time Status** — Frontend polls while AI runs; instant update on completion

---

## Slide 5 — Tech Stack

```
Frontend          Backend           AI/NLP               Infrastructure
─────────         ────────          ──────                ──────────────
Next.js 14        FastAPI           Mistral AI (LLM)      Docker Compose
TypeScript        SQLAlchemy        spaCy (NLP)           PostgreSQL 16
Tailwind CSS      PostgreSQL        Sentence Transformers Redis 7
Zustand           Redis             Scikit-learn
TanStack Query    Alembic           Serper API
```

---

## Slide 6 — System Architecture

> Show the architecture diagram from `ARCHITECTURE.md`

Key points to narrate:
- All services run in Docker Compose — one command to start everything
- Backend is async (FastAPI + asyncpg) — handles concurrent evaluations
- AI runs as a **background task** so the student gets an immediate response
- Frontend polls every 4 seconds until status changes from "analyzing"

---

## Slide 7 — AI Evaluation Pipeline

> Show the pipeline flowchart from `SEQUENCE_FLOW.md` (diagram 3)

Walk through each step:
1. **Rule-based scoring** — fast, deterministic, 6 criteria
2. **NLP extraction** — spaCy extracts keywords, Sentence Transformers finds skill gaps
3. **LLM feedback** — Mistral AI generates a structured markdown report
4. **Web research** — Serper searches Google for related papers and prior art
5. **Originality** — Mistral synthesizes uniqueness assessment from research results

> **Key insight:** The pipeline combines rule-based precision with LLM flexibility — scores are objective, feedback is contextual.

---

## Slide 8 — Scoring Model

| Criterion | Weight | What It Measures |
|---|---|---|
| Title | 10% | Clarity, keyword relevance, length |
| Description | 20% | Depth, completeness, sentence quality |
| Modules | 20% | Number and distinctness of components |
| Technologies | 20% | Stack coverage for the chosen domain |
| Innovation | 15% | Semantic similarity to innovation concepts |
| Feasibility | 15% | Balance between modules and technologies |

> **Total = Weighted average of 6 scores** → Single actionable number out of 100

---

## Slide 9 — Demo Walkthrough

**Follow this order for the live demo:**

1. **Register** a student account (`student@test.com / test123`)
2. **Register** a faculty account (`faculty@test.com / test123`)
3. Log in as **student** → Submit the sample project (see `SETUP.md` test data)
4. Watch status change: `analyzing` → `reviewed`
5. Open the **feedback page** — show:
   - Radar chart with 6 scores
   - AI narrative feedback (Markdown rendered)
   - Missing skills list
   - Related papers and similar projects
   - Originality verdict
6. Log in as **faculty** → Open `Submissions` → Click the project
7. Show the same AI analysis from faculty perspective
8. Enter score + remarks → Click **"Select"**
9. Switch back to student — show finalized score + faculty remarks

---

## Slide 10 — Database Schema

> Show the ER diagram from `SCHEMAS.md`

Three tables:
- `users` — stores students and faculty with role-based access
- `projects` — tracks submissions and status through the workflow
- `evaluations` — stores complete AI output per project (1:1 with project)

---

## Slide 11 — Security & Auth

- JWT Bearer tokens (HS256, configurable expiry)
- Password hashing via **bcrypt** (industry standard)
- Role-based access control via FastAPI dependency injection
- Frontend: automatic token injection via Axios interceptor
- Frontend: auto-redirect to `/login` on 401

---

## Slide 12 — Challenges & Solutions

| Challenge | Solution |
|---|---|
| passlib incompatible with bcrypt 4.x | Replaced passlib with direct `bcrypt` library |
| Frontend starting before backend ready | Docker `healthcheck` + `condition: service_healthy` |
| JWT `sub` is string, DB id is integer | Explicit `int(payload.get("sub"))` cast in `deps.py` |
| Tailwind CSS not applying styles | Missing `postcss.config.js` — created and configured |
| AI evaluation blocks the request | Moved to FastAPI `BackgroundTasks` with polling |

---

## Slide 13 — What Could Be Extended

| Feature | Effort | Value |
|---|---|---|
| Plagiarism detection (fingerprinting) | Medium | High |
| Email notifications on evaluation complete | Low | High |
| Admin panel for user management | Medium | Medium |
| PDF report export | Low | Medium |
| Project comparison / ranking view | Medium | High |
| Celery queue for heavy AI tasks | High | High (scalability) |
| Multi-language feedback | Low | Medium |

---

## Slide 14 — Conclusion

**SmartEval delivers:**
- ⚡ Instant, consistent, multi-dimensional project evaluation
- 🤖 AI-powered feedback students can act on
- 📊 Structured data for faculty decision-making
- 🔧 Production-ready architecture (Docker, async, JWT, health checks)

> "From submission to scored feedback in under 30 seconds."

---

## Q&A Preparation

**Q: Why Mistral AI and not OpenAI?**  
A: Mistral offers a generous free tier and comparable quality for structured text generation. The client is abstracted — swapping models is a one-line config change.

**Q: How accurate is the scoring?**  
A: The rule-based scores are deterministic (title length, module count, etc.). Innovation and feasibility use semantic similarity which is more subjective — but faculty can override any score.

**Q: Does it work offline?**  
A: Scoring and NLP work offline. Mistral feedback and Serper web search require internet — the app gracefully handles API failures.

**Q: How does it scale?**  
A: The backend is fully async. Heavy AI tasks are in background tasks. For production scale, Celery workers (already in requirements.txt) would handle the queue.

**Q: What happens if the AI takes too long?**  
A: The frontend polls every 4 seconds with up to 5 retries. The project remains in "analyzing" state with a visible spinner until complete.
