# Architecture

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Docker Compose                              │
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────────┐  │
│  │  Frontend    │────▶│   Backend    │────▶│    PostgreSQL 16   │  │
│  │  Next.js 14  │     │   FastAPI    │     │    (smart_eval)    │  │
│  │  :3000       │◀────│   :8000      │     └────────────────────┘  │
│  └──────────────┘     │              │                              │
│                        │              │────▶┌────────────────────┐  │
│                        └──────────────┘     │    Redis 7         │  │
│                                │            │    :6379           │  │
│                                │            └────────────────────┘  │
│                                │                                     │
│                    ┌───────────▼───────────┐                        │
│                    │   External Services   │                        │
│                    │  • Mistral AI API     │                        │
│                    │  • Serper (Google)    │                        │
│                    └───────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

```
backend/app/
│
├── main.py                     # FastAPI app, CORS, lifespan, table creation
│
├── core/
│   ├── config.py               # Pydantic Settings (env vars)
│   ├── security.py             # bcrypt hash/verify, JWT encode/decode
│   └── deps.py                 # get_current_user, require_role (DI)
│
├── db/
│   ├── base.py                 # DeclarativeBase
│   ├── session.py              # Async engine, AsyncSessionLocal, get_db()
│   └── all_models.py           # Import all models for Alembic detection
│
├── models/                     # SQLAlchemy ORM models
│   ├── user.py                 # User (id, email, role, department…)
│   ├── project.py              # Project (title, modules[], status…)
│   └── evaluation.py           # Evaluation (scores, feedback, papers…)
│
├── schemas/                    # Pydantic request/response DTOs
│   ├── user.py                 # UserRegister, UserLogin, UserOut, TokenOut
│   ├── project.py              # ProjectSubmit, ProjectOut, StatusUpdate
│   └── evaluation.py          # EvaluationOut, FacultyReview, RelatedPaper
│
├── api/v1/endpoints/
│   ├── auth.py                 # POST /auth/register, POST /auth/login
│   ├── projects.py             # CRUD + status + background AI trigger
│   └── evaluations.py         # GET evaluation, PATCH faculty-review
│
├── services/
│   └── evaluation_service.py  # run_ai_evaluation() orchestrator
│
└── ai/
    ├── scorer.py               # 6 rule-based score functions + weighted total
    ├── nlp_processor.py        # spaCy: keyword + tech extraction
    ├── skill_matcher.py        # Sentence Transformers: skill gap analysis
    ├── mistral_client.py       # Mistral AI chat wrapper
    └── serper_client.py        # Serper API: related papers + similar projects
```

### Request Lifecycle

```
HTTP Request
    │
    ▼
FastAPI Router
    │
    ▼
Dependency Injection
  ├── get_db()           → AsyncSession
  └── get_current_user() → User (JWT validation)
    │
    ▼
Endpoint Handler
    │
    ├── (on submit) BackgroundTask → run_ai_evaluation()
    │
    ▼
Pydantic Schema Validation → Response
```

---

## AI Evaluation Pipeline

```
run_ai_evaluation(project, db)
│
├── 1. SCORING (scorer.py)
│   ├── score_title()         → 0-100 (word count, keyword presence)
│   ├── score_description()   → 0-100 (length + quality)
│   ├── score_modules()       → 0-100 (module count adequacy)
│   ├── score_technologies()  → 0-100 (stack coverage for domain)
│   ├── score_innovation()    → 0-100 (semantic similarity to innovation terms)
│   ├── score_feasibility()   → 0-100 (module/tech ratio balance)
│   └── compute_total_score() → weighted avg
│       Weights: Title 10%, Desc 20%, Modules 20%, Tech 20%
│                Innovation 15%, Feasibility 15%
│
├── 2. NLP ANALYSIS (nlp_processor.py + skill_matcher.py)
│   ├── extract_keywords()    → noun chunks + tech terms (spaCy)
│   └── match_skills()        → matched + missing skills (Sentence Transformers)
│
├── 3. AI FEEDBACK (mistral_client.py)
│   ├── Prompt: project title + description + scores
│   └── Response: structured markdown feedback
│
├── 4. MODULE SUGGESTIONS (mistral_client.py)
│   ├── Prompt: existing modules + domain
│   └── Response: JSON array of suggested modules
│
├── 5. WEB RESEARCH (serper_client.py)
│   ├── search_related_work(title, domain)
│   ├── → related_papers: [{title, url, snippet}]
│   └── → similar_projects: [{title, url, snippet}]
│
├── 6. ORIGINALITY ANALYSIS (mistral_client.py)
│   ├── Prompt: title + related papers + similar projects
│   └── Response: originality verdict text
│
└── 7. PERSIST
    ├── Upsert Evaluation record
    └── Update project.status = "analyzed"
```

---

## Frontend Architecture

```
frontend/src/
│
├── app/                        # Next.js App Router pages
│   ├── (auth)/                 # Route group — no layout, no auth
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── student/
│   │   ├── layout.tsx          # Sidebar layout (auth guard)
│   │   ├── dashboard/page.tsx
│   │   ├── submit/page.tsx
│   │   └── feedback/[id]/page.tsx
│   ├── faculty/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── submissions/page.tsx
│   │   └── review/[id]/page.tsx
│   ├── layout.tsx              # Root layout → Providers
│   └── page.tsx                # Root redirect
│
├── components/shared/
│   ├── Providers.tsx           # QueryClient + Toaster
│   ├── Sidebar.tsx             # Role-aware navigation
│   ├── ProjectCard.tsx         # Project summary card
│   ├── ScoreChart.tsx          # Recharts RadarChart
│   ├── Spinner.tsx             # Spinner + PageLoader
│   └── Toaster.tsx             # Radix UI toast renderer
│
├── hooks/
│   ├── useAuth.ts              # login, register, logout
│   ├── useProjects.ts          # TanStack Query (get/submit/update)
│   └── useToast.ts             # Toast Zustand store + helper
│
├── lib/
│   ├── api.ts                  # Axios instance (JWT interceptor, 401 redirect)
│   ├── constants.ts            # APP_NAME, ROUTES, PROJECT_DOMAINS
│   └── utils.ts                # cn(), scoreColor(), statusBadgeColor()
│
├── store/
│   └── authStore.ts            # Zustand (user, token, persist to localStorage)
│
└── types/
    └── index.ts                # User, Project, Evaluation, AuthResponse…
```

### Data Flow

```
User Action (click/form submit)
    │
    ▼
Page Component
    │
    ▼
Custom Hook (useAuth / useProjects)
    │
    ├── Mutation → api.ts (Axios) → Backend API
    │                                    │
    │   ◀──────── response ──────────────┘
    │
    ├── TanStack Query cache invalidation
    │
    └── Zustand store update (auth only)
         │
         ▼
    React re-render
```

---

## Authentication Flow

```
Browser                     Frontend                    Backend
  │                             │                           │
  │── POST /auth/login ────────▶│                           │
  │                             │── POST /api/v1/auth/login▶│
  │                             │                           │── verify bcrypt
  │                             │                           │── create JWT {sub, role}
  │                             │◀── {access_token, user} ──│
  │                             │── zustand.setAuth()       │
  │                             │── localStorage.token      │
  │                             │                           │
  │                             │── GET /api/v1/projects/my │
  │                             │   Authorization: Bearer…  │
  │                             │                           │── decode JWT
  │                             │                           │── int(sub) → User.id
  │                             │                           │── return User
  │                             │◀── projects[]  ──────────│
```

---

## Startup Order (Docker Compose)

```
postgres ──(healthy)──▶ backend ──(healthy)──▶ frontend
redis    ──(healthy)──▶ backend
```

Healthchecks:
- **postgres**: `pg_isready -U postgres -d smart_eval`
- **redis**: `redis-cli ping`
- **backend**: `HTTP GET /health` → 200
