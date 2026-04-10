# SmartEval — AI-Powered Project Evaluation System

> Intelligent final-year project review and evaluation platform with structured AI scoring, Mistral-generated feedback, web research integration, and faculty oversight.

---

## What It Does

SmartEval automates the evaluation of student final-year projects. When a student submits a project, an AI pipeline runs immediately in the background:

- Scores 6 criteria (title, description, modules, technologies, innovation, feasibility)
- Extracts keywords and identifies missing skills using NLP (spaCy + Sentence Transformers)
- Generates structured natural-language feedback via Mistral AI
- Searches for related academic papers and similar existing projects (Serper/Google)
- Produces an originality verdict

Faculty can then review the AI analysis, override scores, add remarks, and finalize decisions (Select / Waitlist / Reject).

---

## Features

| Feature | Description |
|---|---|
| AI Scoring | 6-dimension weighted scoring (0–100) per project |
| NLP Feedback | Mistral AI narrative feedback with specific suggestions |
| Skill Gap Analysis | Missing technologies per domain via Sentence Transformers |
| Web Research | Related papers + similar projects via Serper API |
| Originality Verdict | AI-assessed uniqueness of the project idea |
| Faculty Review | Score override, remarks, finalization with status workflow |
| Role-based Access | Student / Faculty / Admin with JWT auth |
| Real-time Polling | Frontend polls while AI evaluation is running |

---

## Tech Stack

**Backend:** Python 3.11 · FastAPI · SQLAlchemy (async) · PostgreSQL 16 · Redis 7  
**AI/NLP:** Mistral AI · spaCy (en_core_web_sm) · Sentence Transformers · Serper API  
**Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand · TanStack Query  
**Infrastructure:** Docker Compose · Alembic · asyncpg · Uvicorn

---

## Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd smart-project-review-and-eval

# 2. Set environment variables
cp backend/.env.example backend/.env
# Edit backend/.env — add MISTRAL_API_KEY and SERPER_API_KEY

# 3. Start everything
docker compose up --build

# 4. Open in browser
open http://localhost:3000
```

See [SETUP.md](./SETUP.md) for full setup instructions including manual (non-Docker) setup.

---

## Project Structure

```
smart-project-review-and-eval/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── ai/               # Scoring, NLP, Mistral client, Serper client
│   │   ├── api/v1/endpoints/ # REST endpoints (auth, projects, evaluations)
│   │   ├── core/             # Config, security, deps
│   │   ├── db/               # SQLAlchemy session and base
│   │   ├── models/           # ORM models (User, Project, Evaluation)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # AI evaluation orchestration
│   │   └── main.py           # FastAPI app entry point
│   ├── alembic/              # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # Next.js 14 application
│   └── src/
│       ├── app/              # Pages (auth, student, faculty)
│       ├── components/shared/# Sidebar, ProjectCard, ScoreChart, Toaster…
│       ├── hooks/            # useAuth, useProjects, useToast
│       ├── lib/              # api.ts, utils.ts, constants.ts
│       ├── store/            # Zustand auth store
│       └── types/            # Shared TypeScript types
├── docker-compose.yml
├── README.md
├── SETUP.md
├── ARCHITECTURE.md
├── SEQUENCE_FLOW.md
└── SCHEMAS.md
```

---

## Default Ports

| Service | Port |
|---|---|
| Frontend (Next.js) | 3000 |
| Backend (FastAPI) | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |

---

## API Docs

FastAPI auto-generates interactive docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
