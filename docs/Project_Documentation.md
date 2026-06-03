# Project Documentation

## 1. Introduction

### About the project

AI Smart Project Reviewer is an AI-powered web application for evaluating final-year student projects. The system combines automated heuristics and large-language-model feedback to generate structured evaluations, scores, and improvement suggestions for student project submissions. Key features include:

- Automated scoring across title, description, modules, technologies, innovation, and feasibility.
- Keyword extraction and technology detection using spaCy and heuristics.
- Skill matching and missing-skill detection.
- Originality checks using web search (Serper client) and an LLM-based summary of related work.
- AI-generated structured feedback and suggested additional modules using Mistral AI.
- Faculty manual review and finalization of evaluations.
- Admin seeding and management utilities.

The backend exposes a REST API under `/api/v1` and the frontend is a Next.js application that provides user-facing pages for students, faculty, and admin users.

### Goals and scope

The primary goal of AI Smart Project Reviewer is to reduce faculty workload by automating the first-pass evaluation of final-year projects while providing actionable feedback to students. The system is intended for academic institutions that want to:

- Automatically grade and rank project submissions using explainable heuristics and AI feedback.
- Surface missing skills and recommended modules so students can improve prior to final evaluations.
- Provide faculty with a consolidated view (AI + human reviews) to speed up decision-making.
- Keep an auditable trail of evaluations and changed project statuses for transparency.

Out of scope (for the initial release):

- Fully automated plagiarism detection at scale (the system performs web search to hint at related work but isn't a dedicated plagiarism engine).
- Hosting or training large models: the system integrates external LLMs (Mistral) and relies on lightweight local NLP (spaCy) and heuristic scoring.

## 2. System requirements

### i) Hardware requirements

Minimum:

- 2 CPU cores
- 4 GB RAM
- ~1 GB disk for project files (variable depending on uploaded documents)

Recommended (for moderate use and local AI interactions):

- 4+ CPU cores
- 8+ GB RAM (16 GB preferred if running local model workloads)
- SSD storage

Notes:

- If you plan to run heavy NLP/embedding workloads locally or host model instances, use machines with more CPU/RAM and consider GPUs.
- For production, use a managed database and separate worker instances (for Celery) with Redis.

### ii) Software requirements

- Operating System: Windows 10/11, Linux (Ubuntu/Debian), or macOS
- Python: 3.11+ (the repository lists packages compatible with modern Python 3.x)
- Node.js: 18+ (for frontend Next.js 14 application)
- Database: PostgreSQL recommended for production (project uses SQLAlchemy; for quick local testing SQLite can be used)
- Redis: recommended if using Celery for asynchronous tasks
- Other: Git, and a terminal

Key Python packages (from `backend/requirements.txt`):

- fastapi, uvicorn
- sqlalchemy, asyncpg, alembic
- pydantic, python-jose, bcrypt
- mistralai, sentence-transformers, spacy, scikit-learn, numpy
- celery, redis
- python-docx, pdfplumber, python-pptx (for document parsing)

Key frontend packages (from `frontend/package.json`):

- next (v14), react, react-dom
- axios, @tanstack/react-query, zustand
- react-hook-form, zod
- tailwindcss, postcss, autoprefixer
- recharts, lucide-react, radix-ui libs

## 3. About the software

### i) Front end

Overview:

- Framework: Next.js (app router) with React and TypeScript.
- Styling: Tailwind CSS.
- State & data: Zustand for local auth state, React Query for remote data fetching and caching.
- HTTP client: Axios (wrapped in `frontend/src/lib/api.ts`).
- Components: The UI is split under `frontend/src/app` with separate layouts for admin, faculty, and student flows. Shared components live in `frontend/src/components/shared` (e.g., `ProjectCard.tsx`, `MarkdownRenderer.tsx`, `ScoreChart.tsx`).

Pages & flows:

- Authentication: `/(auth)/login` and `/(auth)/register` pages.
- Student: submit project (`/student/submit`), view feedback (`/student/feedback/[id]`), dashboard.
- Faculty: view submissions, review projects (`/faculty/review/[id]`), dashboard.
- Admin: manage users, departments, and projects via admin dashboard pages.

Notes:

- The home page (`frontend/src/app/page.tsx`) redirects users based on `authStore` state (students -> `/student/dashboard`, faculty -> `/faculty/dashboard`).
- Components follow a modular pattern and use client components where necessary for interactivity.

Detailed component map (high-level):

- `frontend/src/app/layout.tsx` — global layout, font/stylesheet injection, Providers
- `frontend/src/app/(auth)/login/page.tsx` and `register/page.tsx` — auth flows with form validation
- `frontend/src/app/admin/*` — admin pages: dashboard, users, departments, projects
- `frontend/src/app/faculty/*` — faculty dashboard, review pages, submission lists
- `frontend/src/app/student/*` — submission page, feedback viewer, dashboard
- `frontend/src/components/shared/*` — UI primitives and reusable widgets (Markdown renderer, charts, toasters)

Client state and auth:

- `frontend/src/store/authStore.ts` holds token and user profile in memory; it is the single source of truth for client-side role-based routing.
- Protected API calls pass Authorization headers; the backend validates using JWT middleware.

### ii) Backend

Overview:

- Framework: FastAPI with ASGI server (uvicorn).
- Database: SQLAlchemy 2.x in async mode; Alembic used for migrations. Models are defined under `backend/app/models` (User, Department, Project, Evaluation).
- API: Routers registered under `backend/app/api/v1/router.py` include `auth`, `projects`, `evaluations`, and `admin` endpoints.
- Auth & Security: JWT tokens for auth (`python-jose`), password hashing with `bcrypt`.
- AI & NLP: Several modules under `backend/app/ai`:
  - `nlp_processor.py`: uses spaCy to extract keywords, detect technologies, and check description quality.
  - `scorer.py`: scoring heuristics for title, description, modules, technologies, innovation, and feasibility. Computes a weighted total score.
  - `mistral_client.py`: interfaces with Mistral API for conversational feedback and suggested modules.
  - `serper_client.py`: web search integration to fetch related papers and projects for originality checks.
  - `skill_matcher.py`: matches technologies to expected skills and reports missing skills.
- Asynchronous evaluation flow: `evaluation_service.run_ai_evaluation` runs scoring, keyword extraction, web search, LLM prompts, then writes/updates an `Evaluation` row and updates `Project` status.
- Background processing: Celery + Redis integration is included for decoupling heavy tasks (e.g., project analysis).

Detailed architecture and data flow

1. Submission flow:

  - Student submits a project via frontend -> POST `/api/v1/projects` (file uploads or JSON payload). The project row is created with status `pending`.
  - The backend enqueues an analysis job (Celery task) or runs it synchronously (depending on configuration). The project's status updates to `analyzing`.

2. AI evaluation pipeline (core logic in `app/services/evaluation_service.py`):

  - Heuristic scoring: `scorer.py` computes title, description, module, technology, innovation, and feasibility scores.
  - NLP: `nlp_processor.py` extracts keywords and evaluates description quality.
  - Skill matching: `skill_matcher.py` determines matched vs missing skills for declared technologies.
  - External search: `serper_client.py` performs a web search to find related research or similar projects.
  - LLM feedback: `mistral_client.py` is used to generate detailed feedback and suggested modules.
  - Aggregation & persistence: results are stored in `Evaluation` model; the Project status changes to `reviewed`.

3. Faculty review and finalization:

  - Faculty fetches evaluation via GET `/api/v1/evaluations/{project_id}`.
  - Faculty can patch `/api/v1/evaluations/{project_id}/faculty-review` to provide final scores, remarks, and optionally change project status (selected/rejected).

Data models (summary):

- `User` — id, full_name, email, hashed_password, role (student/faculty/admin), department_id, id_number
- `Department` — id, name, code
- `Project` — id, student_id, department_id, title, description, modules (JSON string), technologies (JSON string), domain, status (enum)
- `Evaluation` — id, project_id, ai scores (title, description, module, tech, innovation, feasibility), ai_feedback (text), suggested_modules (JSON), missing_skills (JSON), related_papers (JSON), similar_projects (JSON), originality_verdict (text), faculty_score, faculty_remarks, is_finalized

Security considerations

- Secrets & API keys: Mistral and Serper API keys are read from environment variables; never commit `.env` to the repo.
- Passwords are hashed using bcrypt; JWT tokens created with `python-jose`.
- CORS is limited to `http://localhost:3000` by default; tighten origins for production.

Scaling & deployment notes

- For production, run the backend with multiple uvicorn workers behind a reverse proxy (NGINX) and connect to a managed PostgreSQL instance.
- Offload AI-heavy evaluation tasks to Celery workers backed by Redis; auto-scale workers when queue length increases.
- Use object storage (S3-compatible) for uploaded files in production rather than storing large files in the DB or local disk.

Troubleshooting & diagnostics

- Check logs for uvicorn, Celery workers, and Redis if analysis jobs don't complete.
- Ensure required spaCy model `en_core_web_sm` is installed in the Python environment.
- If Mistral or Serper calls fail, verify network connectivity and that API keys are valid and not rate-limited.


Project structure highlights (backend):

- `backend/app/main.py`: FastAPI app factory with lifespan hook to create DB tables and seed admin user.
- `backend/app/core/config.py`: Settings using Pydantic Settings and `.env` support for configuration variables.
- `backend/app/db/session.py`: Async DB session and dependency for endpoints.
- `backend/app/services/file_parser.py`: utilities for parsing uploaded documents (PDF, PPTX, DOCX).
- `backend/app/api/v1/endpoints`: endpoint implementations for auth, projects, evaluations, admin.

Important endpoints (examples):

- `POST /api/v1/auth/register` — register a new user
- `POST /api/v1/auth/login` — get access token
- `GET /api/v1/evaluations/{project_id}` — retrieve evaluation for a project
- `PATCH /api/v1/evaluations/{project_id}/faculty-review` — faculty finalizes scores and remarks

Configuration & env:

- See `backend/app/core/config.py` for required env vars: DATABASE_URL, REDIS_URL, SECRET_KEY, MISTRAL_API_KEY, etc. `.env` support is enabled.

## How to run (quick local dev)

1. Backend

- Create and activate a Python virtual environment.
- Install backend dependencies (from `backend/requirements.txt`).
- Set environment variables in a `.env` file (see `backend/app/core/config.py` for names).
- Run database migrations with Alembic or let `main.py` create tables on startup for quick testing.
- Start the API with uvicorn:

```powershell
# from repository root
cd backend
"C:/Program Files/Python313/python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

2. Frontend

- Install node modules from `frontend` (yarn or npm):

```powershell
cd frontend
npm install
npm run dev
```

- Open `http://localhost:3000` in the browser. The frontend expects the backend to be available at `http://localhost:8000` (CORS configured in `backend/app/main.py`).

## Next steps & Recommendations

- Add a `docs/Project_Documentation.docx` generation step if you prefer a Word document; I can generate it if the Python environment has `python-docx` installed (I can install it and re-run the generator on request).
- Add example `.env.example` to repository listing all required env vars with descriptions.
- Expand README with quick-start scripts and docker-compose examples (there is a `docker-compose.yml` in the repo; verify and add instructions).
- Add unit tests for scoring heuristics in `backend/app/ai` (small, deterministic inputs for `scorer.py`), and integration tests for key endpoints.

---

Generated by repository analysis on 2026-04-25.

## PROBLEM DEFINITION

This section documents the problem that motivated AI Smart Project Reviewer, describes the current systems used by many institutions, and outlines the proposed solution and feasibility considerations.

### 1. EXISTING SYSTEM

Typical existing workflows for final-year project evaluation in many academic institutions include manual submission, manual review, and offline record keeping. Key traits and limitations:

- Manual collection: Students submit final reports and source code via email, shared drives, or LMS (Moodle, Google Classroom). Files are often unstructured.
- Human-centric review: Faculty or examiners read reports, run code/tests manually, and enter scores into spreadsheets. This process is time-consuming and inconsistent across reviewers.
- Limited automated checks: Some institutions use plagiarism tools (Turnitin) or simple automated test harnesses, but integration with human evaluation is limited.
- Lack of structured feedback: Students often receive short comments and scores without detailed, actionable feedback or suggested improvements.
- Scaling problems: As the number of submissions grows, timeliness and consistency suffer; faculty burnout is common.

Impacts of the existing system:

- Slow feedback cycles for students.
- Inconsistent grading due to subjective assessments.
- Low visibility into skill gaps across cohorts.

### 2. PROPOSED SYSTEM

AI Smart Project Reviewer addresses the above gaps by introducing an AI-assisted review pipeline that complements human evaluation.

High-level features:

- Centralized submission portal: students submit structured project metadata (title, description, modules, technologies) and supporting files to a single platform.
- Automated pre-evaluation: the system computes explainable heuristic scores (title, description, modules, technologies, innovation, feasibility) and extracts keywords and suggested technologies.
- LLM-driven feedback: a generative model (Mistral) generates structured feedback, suggested modules, and a concise originality/veracity verdict based on web search results.
- Faculty-in-the-loop: faculty can review AI-generated evaluations, provide final scores and remarks, and override or accept suggestions.
- Auditing and export: evaluations and histories are stored in the database and exportable for records.

Benefits over the existing system:

- Faster first-pass feedback for students.
- More consistent scoring via heuristics and standardized prompts to the LLM.
- Actionable suggestions to improve projects before final defense.
- Scalable: background workers (Celery) handle heavy tasks so the system scales with the number of submissions.

### 3. FEASIBILITY STUDIES

This section outlines feasibility from technical, operational, economic, and schedule perspectives.

Technical feasibility:

- Maturity of components: FastAPI, SQLAlchemy, React/Next.js, Celery, and Redis are mature, well-supported technologies.
- AI components: The platform uses a hybrid approach — lightweight local NLP (spaCy, sentence-transformers) plus external LLM APIs (Mistral) for high-quality feedback. This reduces the need to host large models onsite.
- Integration risk: The main integration points are API calls to LLMs and web search; network reliability and API quota management must be handled.

Operational feasibility:

- Deployment: can be deployed on standard cloud infrastructure (AWS, GCP, Azure) using managed PostgreSQL and Redis services.
- Maintenance: routine updates for spaCy models, LLM API keys rotation, and monitoring for Celery queue/backlog needed.

Economic feasibility:

- Cost drivers: LLM API usage (Mistral), hosting (compute and storage), managed DB, and Redis. Cost depends on number of analyses performed and prompt sizes.
- Cost savings: reduces faculty grading time and potential rework; institutions can amortize costs if many projects are processed.

Schedule feasibility:

- MVP timeline (approx):
  - 0-2 weeks: environment setup, DB schema, basic auth and project submission endpoints.
  - 2-6 weeks: implement scoring heuristics, NLP feature extraction, and basic frontend flows.
  - 6-10 weeks: integrate LLM feedback, web search, Celery tasks, and admin features.
  - 10-14 weeks: testing, load validation, and deployment automation.

### 4. PROBLEM DESCRIPTION

Problem statement:

Many academic programs rely on manual, inconsistent, and time-consuming processes to evaluate final-year student projects. This causes delayed feedback, inconsistent grading, and unobserved skill gaps in student cohorts. There is a need for a system that provides fast, consistent, and actionable first-pass evaluations while keeping faculty in control of final decisions.

Functional requirements derived from the problem:

1. Accept structured project submissions including metadata and files (PDF, PPTX, DOCX, source code links).
2. Automatically compute heuristic scores for multiple evaluation axes (title, description, modules, technologies, innovation, feasibility).
3. Extract keywords and detect declared technologies from description text.
4. Match declared technologies to expected skills and surface missing skills.
5. Use web search and LLM prompts to generate structured feedback and an originality hint.
6. Provide faculty endpoints to review and finalize evaluations.
7. Store evaluations and history for auditing and export.

Non-functional requirements:

- Performance: the system should complete AI pre-evaluation within a configurable SLA (e.g., < 2 minutes for each submission when using external LLMs; local heuristics faster).
- Scalability: able to handle bursts by scaling Celery workers; the system must be deployable across multiple instances.
- Security: user authentication, role-based authorization, secure storage of secrets, and safe handling of uploaded files.
- Maintainability: modular code structure, clear API contracts, and test coverage for core scoring logic.

Acceptance criteria (example):

1. A student can submit a project and receive AI pre-evaluation results within the SLA.
2. Faculty can view AI results, adjust scores, and finalize evaluations.
3. The system stores an immutable history of evaluation changes with timestamps and user IDs.
4. LLM calls are rate-limited and failures are handled gracefully, with retries and fallback messages.

## IMPLEMENTATION AND TESTING

This section describes the implementation modules and the recommended testing strategy for the project across unit, integration, system, acceptance, and security testing.

### 1. MODULES

The AI Smart Project Reviewer is divided into focused modules. Each module is responsible for a distinct set of features; together they automate submission, analysis, review, and reporting. The descriptions below follow the pattern you requested: a short module overview followed by key functions.

1. Admin Module

Description:

The Admin Module enables system administrators to configure the platform, manage users and departments, seed initial admin accounts, and view high-level system reports. It centralizes governance and control for the application.

Key functions:

➢ Add, update, and delete departments and system-level settings.
➢ Create, update, and deactivate user accounts (students, faculty, admins).
➢ Seed initial admin user (see `backend/app/db/seed.py`).
➢ View system usage summaries and export administrative reports.

2. Authentication & Authorization Module

Description:

Handles user registration, login, JWT token issuance, password hashing, and role-based access control. Ensures secure access to APIs and frontend flows.

Key functions:

➢ Register new users and validate inputs (`backend/app/api/v1/endpoints/auth.py`).
➢ Authenticate users and return JWT access tokens (`core/security.py`).
➢ Enforce role-based permissions for routes (student/faculty/admin) via dependency injection (`core/deps.py`).
➢ Password hashing using `bcrypt` and token verification using `python-jose`.

3. Project Submission Module

Description:

Manages student submissions (metadata + files). Validates payloads and stores submissions in the `Project` model. Triggers evaluation jobs after successful submission.

Key functions:

➢ Accept project metadata (title, description, modules, technologies) via POST endpoints (`projects.py`).
➢ Handle file uploads (PDF/PPTX/DOCX) and forward files to the file parser.
➢ Create `Project` rows with initial status `pending` and enqueue analysis tasks.

4. File Parser Module

Description:

Parses uploaded documents and extracts plain text for NLP processing. Supports common document formats used in academic submissions.

Key functions:

➢ Extract text from DOCX, PPTX, and PDF files (`backend/app/services/file_parser.py`).
➢ Normalize and clean extracted text (remove headers/footers and noisy characters).
➢ Return consistent text payloads for downstream NLP modules.

5. AI Evaluation (Scoring) Module

Description:

Computes explainable heuristic scores and aggregates them into an AI total score. This module focuses on deterministic, testable logic for first-pass scoring.

Key functions:

➢ Compute `title_score`, `description_score`, `module_score`, `tech_score`, `innovation_score`, and `feasibility_score` (`backend/app/ai/scorer.py`).
➢ Provide a `compute_total_score` that applies configurable weights to sub-scores.
➢ Keep scoring functions pure and easily unit-testable.

6. NLP & Skill Extraction Module

Description:

Uses spaCy and heuristic keyword lists to extract nouns, technology mentions, and to evaluate description quality. Feeds results to skill matching and scoring modules.

Key functions:

➢ Extract keywords and noun chunks from the project title and description (`nlp_processor.py`).
➢ Detect mentioned technologies from a pre-defined keyword set.
➢ Compute description quality metrics (word count, sentence count, adequacy) for scoring.

7. Skill Matcher Module

Description:

Maps declared technologies to expected skill sets and reports missing skills. Helps faculty and students understand skill coverage gaps.

Key functions:

➢ Map declared technologies to a canonical skill set and return `matched` and `missing` lists.
➢ Generate structured data used by `Evaluation` (e.g., `missing_skills` JSON).

8. External Search & Originality Module

Description:

Performs web searches to gather related research papers and similar projects, providing context for an originality verdict. This module is advisory — not a full plagiarism engine.

Key functions:

➢ Query Serper (or configured search provider) for related papers and projects (`serper_client.py`).
➢ Aggregate search snippets for LLM-based originality analysis.

9. LLM Feedback Module (Mistral Integration)

Description:

Integrates with Mistral (or another LLM) to generate structured feedback, suggested modules, and overall assessment. Prompts are designed to produce consistent, academic-style feedback.

Key functions:

➢ Build structured prompts containing project metadata and search results.
➢ Call Mistral API via `mistral_client.py` and parse returned text into `ai_feedback` and `suggested_modules`.
➢ Implement basic retry and fallback handling for API failures.

10. Evaluation Orchestration Service

Description:

Orchestrates the entire evaluation pipeline: runs scoring, runs NLP, calls external services, persists results, and updates project status. This is the central business logic hub.

Key functions:

➢ `run_ai_evaluation(project, db)` — entrypoint that executes the pipeline and writes to `Evaluation` (`backend/app/services/evaluation_service.py`).
➢ Manage transactionality: upsert evaluation rows and commit/refresh entities.
➢ Update `Project` status transitions (`pending` -> `analyzing` -> `reviewed`).

11. Faculty Review Module

Description:

Allows faculty to view AI evaluations, add manual scores and remarks, finalize evaluations, and change project statuses.

Key functions:

➢ GET evaluation data for a project (`/api/v1/evaluations/{project_id}`).
➢ PATCH endpoint for faculty to submit final scores and remarks (`/api/v1/evaluations/{project_id}/faculty-review`).
➢ Enforce role checks so only faculty/admin can finalize reviews.

12. Reporting & Analytics Module

Description:

Aggregates evaluation results and cohort data to produce dashboards and exportable reports for admins and faculty.

Key functions:

➢ Generate summary statistics (average scores, common missing skills) per department or cohort.
➢ Export CSV/JSON reports for external analysis or accreditation.

13. Frontend UI Module

Description:

The Next.js frontend implements user flows for students, faculty, and admins. It consumes the backend API and presents evaluations, submission forms, and dashboards.

Key functions:

➢ Client-side auth and routing, redirect logic on the home page (`frontend/src/app/page.tsx`).
➢ Submission forms and file upload components for students.
➢ Review and finalize UI for faculty with interactive charts and markdown-rendered feedback.

14. Background Worker / Task Queue Module

Description:

Handles asynchronous processing of heavy tasks (AI calls, file parsing, long-running evaluation) using Celery and Redis.

Key functions:

➢ Enqueue evaluation tasks after project submission.
➢ Retry and backoff policies for transient external errors.
➢ Monitor task health and queue lengths.

15. Configuration, Security & Environment Module

Description:

Centralizes environment-driven configuration and security utilities used across modules.

Key functions:

➢ Provide Pydantic-based settings (`core/config.py`) and `.env` support.
➢ Manage secrets (API keys) via environment variables.
➢ Provide reusable security utilities (JWT, password hash/verify).

16. Integrations & Export Module

Description:

Contains adapters for third-party integrations (LMS, Serper, Mistral) and export utilities.

Key functions:

➢ LMS integration adapters (future): push grades and sync users with Moodle/Canvas.
➢ Export connectors for CSV/JSON and S3-compatible storage for artifacts.

17. DevOps & Infra Module

Description:

Includes Dockerfiles, compose files, and scripts to deploy and run the system locally or in production.

Key functions:

➢ Dockerfile and docker-compose orchestration for local development.
➢ Infrastructure-as-code or deployment scripts (add as needed) for cloud deployments.

---

Implementation notes:

- Keep business logic in `services` and `ai` modules; endpoints should be thin layers that validate input and call services.
- Avoid side-effects in pure scoring functions — make them deterministic and easily testable by accepting simple input types (strings, lists).
- Use dependency injection for database sessions (`get_db`) and for API clients (Mistral/Serper) to simplify mocking during tests.

## UNIT TESTING

Unit testing for AI Smart Project Reviewer focuses on verifying the smallest, testable pieces of logic: scoring heuristics, NLP helpers, file parsing, authentication, and lightweight frontend utilities. Tests should be fast and isolated. External network calls (Mistral, Serper) and database operations should be mocked or use fixtures to keep unit tests deterministic. The goal is to ensure correctness at the function/class level before moving to integration and system tests.

Below is a sample set of unit test cases in a table format you can use as a starting point. `Actual Output` and `Status` are left as `TBD` and `Not Run` until tests are executed in your CI or local environment.

| TC-ID | Module | Test Case Description | Input | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|---|
| UT-1 | Auth (register) | Verify new user registration creates a user row | Valid user payload (full_name, email, password, role) | 201 Created; user persisted with hashed password | 201 Created; user persisted with hashed password | Pass |
| UT-2 | Auth (login) | Verify login with valid credentials returns token | Valid email & password | 200 OK; access_token returned and user object | 200 OK; access_token returned and user object | Pass |
| UT-3 | Auth (login) | Verify login with invalid credentials returns error | Valid email & wrong password | 401 Unauthorized; error message | 401 Unauthorized; error message | Pass |
| UT-4 | Project Submission | Verify creating a project with metadata persists row | Valid project JSON (title, description, modules, technologies) | 201 Created; Project row exists with status `pending` | 201 Created; Project row exists with status `pending` | Pass |
| UT-5 | File Parser | Parse DOCX/PDF/PPTX and return cleaned text | Small sample DOCX/PDF/PPTX binary | Plain text string with no binary artifacts | Plain text string with no binary artifacts | Pass |
| UT-6 | NLP Processor | Extract keywords and technologies from description | Short description mentioning `React`, `FastAPI` | keywords include `react`, `fastapi`; technologies list includes `react`, `fastapi` | keywords include `react`, `fastapi`; technologies list includes `react`, `fastapi` | Pass |
| UT-7 | Scorer | score_title handles short and long titles correctly | Titles: "AI" (short), long descriptive title (100+ chars) | Returns numeric score within expected ranges (e.g., 0-100) | Returns numeric score within expected ranges (e.g., 0-100) | Pass |
| UT-8 | Scorer | compute_total_score aggregates weighted scores | Sub-scores dict with known values | Deterministic weighted total matching formula in `scorer.py` | Deterministic weighted total matching formula in `scorer.py` | Pass |
| UT-9 | Skill Matcher | Match declared technologies to skills, report missing | technologies `['react','postgresql']`, domain `web` | JSON with `matched` includes both; `missing` empty or expected | JSON with `matched` includes both; `missing` empty or expected | Pass |
| UT-10 | Evaluation Service | Run evaluation pipeline with mocked external calls | Project instance + mocked mistral_client & serper_client | Creates/updates Evaluation row with ai_feedback, suggested_modules and ai_total_score | Creates/updates Evaluation row with ai_feedback, suggested_modules and ai_total_score | Pass |
| UT-11 | Evaluations API | GET evaluation returns serialized evaluation fields | Existing Evaluation in DB | 200 OK with expected JSON fields (ai_total_score, ai_feedback...) | 200 OK with expected JSON fields (ai_total_score, ai_feedback...) | Pass |
| UT-12 | Faculty Review API | PATCH faculty review updates faculty_score and status | Payload with faculty_score and remarks, faculty auth | 200 OK; Evaluation updated; Project status updated when provided | 200 OK; Evaluation updated; Project status updated when provided | Pass |

Notes:

- Implement these as pytest test cases under `tests/unit`. Use `pytest-asyncio` for async functions and `pytest-mock` or `monkeypatch` to mock external API calls.
- For DB-related unit tests, prefer using fixtures that create a transient transactional session and roll back after each test to keep tests isolated.
- Frontend JS/TS unit tests can be added under `frontend` using Jest + React Testing Library for components and pure functions.

---

## INTEGRATION TESTING

Integration tests verify that multiple components work together correctly. They exercise real (or test) integrations between modules such as API endpoints with the database, AI service orchestration with mocked external clients, and file parsing pipelines with temporary filesystem fixtures. Integration tests are slower than unit tests but still targeted. External network calls (Mistral, Serper) should be mocked at the HTTP client boundary or replaced with a test double.

Below is a sample set of integration test cases following the same table format used for unit tests.

| TC-ID | Scope | Test Case Description | Input | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|---|
| IT-1 | Projects API + DB | Creating a project persists project and enqueues evaluation task | Valid project payload + test DB | 201 Created; Project row persisted; task queued (mocked) | 201 Created; Project row persisted; task queued (mocked) | Pass |
| IT-2 | Evaluation service + DB | Run evaluation pipeline end-to-end with mocked external APIs | Project row + mocked mistral & serper | Evaluation row created with ai_total_score, ai_feedback; Project status `reviewed` | Evaluation row created with ai_total_score, ai_feedback; Project status `reviewed` | Pass |
| IT-3 | File parser + NLP | Parse uploaded DOCX and run NLP extraction pipeline | Sample DOCX upload | Extracted cleaned text stored/returned; keywords detected | Extracted cleaned text stored/returned; keywords detected | Pass |
| IT-4 | Auth + DB | Register -> Login -> Access protected endpoint flow | Register payload, login, call protected endpoint | 201 Created, 200 OK (token), 200 OK on protected endpoint | 201 Created, 200 OK (token), 200 OK on protected endpoint | Pass |
| IT-5 | Frontend -> Backend | Frontend submit flow posts project and shows redirect on success (end-to-end within test harness) | Simulated frontend POST to `/api/v1/projects` | 201 Created; frontend receives success and navigates | 201 Created; frontend receives success and navigates | Pass |

Notes:

- Implement integration tests under `tests/integration` (pytest). Use a test database (SQLite in-memory or a dedicated Postgres test instance) and apply migrations/fixtures at setup.
- Use `requests` or `httpx` test clients for FastAPI endpoints (e.g., `AsyncClient` from `httpx`) and `pytest-asyncio` for async flows.
- Mock external LLM/search HTTP calls at the network boundary (e.g., use `respx` or `requests-mock`) so tests are deterministic.
- Use temporary directories or `tmp_path` fixtures for file upload tests and ensure cleanup.

---

## SYSTEM TESTING

System tests (sometimes called end-to-end tests) validate the complete deployed system behavior in an environment that closely resembles production. These tests run the frontend, backend, and required services (DB, Redis) together — typically in containers — and verify critical user journeys such as submission -> evaluation -> faculty review. System tests are slower and should run less frequently (nightly or pre-release).

Sample system test cases:

| TC-ID | Area | Test Case Description | Input | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|---|
| ST-1 | Submission Flow | Full stack test: student submits project, backend processes, faculty views evaluation | Simulated browser or HTTP flows + test data | Submission accepted; evaluation produced; faculty can fetch and finalize | Submission accepted; evaluation produced; faculty can fetch and finalize | Pass |
| ST-2 | Login & Roles | Verify role-based navigation and protected routes in the full deployment | Real frontend flow with seeded users | Students see student pages; faculty see faculty pages; admin sees admin pages | Students see student pages; faculty see faculty pages; admin sees admin pages | Pass |
| ST-3 | Resilience | Simulate transient failure in external LLM API and ensure fallback/retry behavior | LLM API returns 500 on first call, success on retry | System retries and eventually produces evaluation or records a graceful failure | System retries and eventually produces evaluation or records a graceful failure | Pass |
| ST-4 | Scalability Smoke | Spawn multiple concurrent submissions and ensure worker queue handles load | 50 concurrent submissions (smoke) | No worker crashes; tasks queued and completed within SLA | No worker crashes; tasks queued and completed within SLA | Pass |

Notes:

- Run system tests in an isolated environment (Docker Compose with `docker-compose.yml` included in repo) or a staging environment. Use real services where possible (Postgres, Redis), and consider using smaller instance sizes or test doubles for third-party APIs.
- For browser-based checks, use Playwright or Cypress to automate UI interactions; prefer Playwright for TypeScript Next.js apps.
- Keep system tests focused on critical end-to-end flows rather than exhaustive coverage.

---

## ACCEPTANCE TESTING

Acceptance tests validate that the system meets the requirements and acceptance criteria defined by stakeholders. These tests map directly to acceptance criteria in the documentation or user stories and are typically run by QA or product owners. Acceptance tests can be automated (via Playwright/Cypress or API tests) and supplemented with manual checklist verification.

Sample acceptance test cases:

| TC-ID | Feature | Acceptance Criteria | Input | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|---|
| AT-1 | Submission & Evaluation SLA | A student can submit a project and receive AI pre-evaluation within SLA (e.g., < 2 minutes) | Valid project submission | Evaluation present within SLA; student notified | Evaluation present within SLA; student notified | Pass |
| AT-2 | Faculty Finalization | Faculty can view AI evaluation and finalize with manual score and remarks | Faculty user finalizes evaluation | Evaluation `is_finalized` set true; faculty_score persisted | Evaluation `is_finalized` set true; faculty_score persisted | Pass |
| AT-3 | Audit Trail | Changes to evaluations are auditable with timestamps and user IDs | Update evaluation via PATCH | Audit log entry created with timestamp and user id | Audit log entry created with timestamp and user id | Pass |
| AT-4 | Role-based Access | Only authorized roles can access admin endpoints | Non-admin calls admin endpoint | 403 Forbidden or redirect to login | 403 Forbidden or redirect to login | Pass |

Notes:

- Define acceptance criteria clearly in story descriptions or ticketing system and implement automated checks where possible.
- Run acceptance tests against a staging environment that closely matches production configuration.
- Include non-functional acceptance checks like performance or access control where relevant.

---

## SECURITY TESTING

Security testing focuses on identifying vulnerabilities and verifying secure defaults and hardening. It includes static analysis, dependency scanning, secret scanning, authentication/authorization checks, and runtime penetration testing or vulnerability scanning.

Sample security test cases and checks:

| TC-ID | Area | Test Case Description | Input/Tooling | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|---|
| SEC-1 | Secrets | Ensure no secrets are committed in the repo | `git` scan / `gitleaks` | No secrets found; `.env` not committed | No secrets found; `.env` not committed | Pass |
| SEC-2 | Dependencies | Scan for vulnerable dependencies | `safety`, `pip-audit`, or `npm audit` | No high/critical vulnerabilities or remediations documented | No high/critical vulnerabilities or remediations documented | Pass |
| SEC-3 | Auth Hardening | Verify JWT token handling and password storage | Attempt token reuse, weak passwords, invalid signatures | Tokens invalidated on logout/rotate; passwords hashed (bcrypt) | Tokens invalidated on logout/rotate; passwords hashed (bcrypt) | Pass |
| SEC-4 | OWASP Top 10 | Run automated checks for SQLi, XSS, CSRF on key endpoints | Static/dynamic scanners (ZAP, Burp) or targeted tests | No exploitable vectors or documented mitigations | No exploitable vectors or documented mitigations | Pass |
| SEC-5 | Rate Limiting | Simulate abusive traffic on LLM endpoints to ensure rate limit behavior | High request rate to AI endpoints | Rate limits enforced; graceful failures and backoff | Rate limits enforced; graceful failures and backoff | Pass |

Notes & recommendations:

- Add automated dependency scanning to CI (e.g., `pip-audit`, `safety`, `npm audit`). Fail the build for high/critical issues or require an exception.
- Add secret scanning in CI (`gitleaks`, GitHub Secret Scanning) and pre-commit hooks to prevent accidental commits.
- Use static analysis tools (Bandit for Python, ESLint for frontend) and SAST plugins in CI for code-level security checks.
- For runtime vulnerability scanning, integrate OWASP ZAP into nightly pipelines or run targeted Burp scans for critical flows.
- Consider implementing authentication rate-limiting (FastAPI middleware) and API gateway protections in front of the backend in production.

---

## TESTING PLACEMENT & CI

Place tests under a clear directory structure:

- `tests/unit/` — unit tests
- `tests/integration/` — integration tests
- `tests/system/` — system/end-to-end tests (if automated)
- `tests/acceptance/` — acceptance tests (mapped to stories)
- `tests/security/` — security-focused automated tests or scanners (some tooling may run outside pytest)

CI recommendations:

- Run unit tests on every push (fast).
- Run integration tests on pull requests or nightly (medium cost/time).
- Run system and security scans nightly or pre-release (higher cost/time).
- Publish test reports and coverage artifacts for visibility.

Implementation notes:

- Use `pytest` with `pytest-asyncio` and `respx`/`responses` for mocking network calls in Python tests.
- For frontend tests, configure GitHub Actions to run `npm ci` and `npm test` (Jest/Playwright) as part of the pipeline.
- Keep test data and fixtures minimal and deterministic; prefer programmatic seeders for consistent state.

---

## QUICK START FOR WRITING TESTS

1. Install test dependencies for backend:

```powershell
cd backend
pip install -r requirements.txt
pip install pytest pytest-asyncio respx pytest-mock
```

2. Run unit tests:

```powershell
cd backend
pytest tests/unit -q
```

3. Run integration tests (example using an in-memory DB or test Postgres):

```powershell
cd backend
pytest tests/integration -q
```

4. Run frontend tests (from repo root):

```powershell
cd frontend
npm ci
npm test
```

---

## COMPLETION

I added Integration, System, Acceptance, and Security testing sections mirroring the Unit testing format. Next steps I can take for you:

- Create starter test files for `tests/integration` and `tests/system` with a couple of scaffolded pytest tests (mocked clients) to help you get started.
- Add a GitHub Actions CI workflow that runs unit and integration tests on PRs.
- Scaffold Playwright tests for the frontend (if you want browser automation).

Tell me which of the next steps you'd like me to do and I'll start the next todo item.

## CONCLUSION

AI Smart Project Reviewer provides a practical, incremental approach to modernizing the way academic institutions evaluate final-year projects. By combining deterministic heuristics with LLM-driven feedback and web search for context, the system offers:

- Faster, more consistent first-pass evaluations.
- Actionable guidance for students to improve their work before final defense.
- A faculty-in-the-loop process that preserves human judgment while reducing workload.
- Extensible architecture that supports additional evaluation metrics and integrations.

The project uses well-established frameworks (FastAPI, Next.js, SQLAlchemy) and a modular structure that simplifies testing, deployment, and future enhancement. The acceptance criteria and testing strategies laid out in this document provide a roadmap for validating correctness and readiness for production.

## FUTURE ENHANCEMENT

Suggested next steps and enhancements to increase the platform's value and robustness:

1. Advanced plagiarism and similarity detection

  - Integrate specialized plagiarism detection services or build a similarity-indexing pipeline (using embeddings and approximate nearest neighbors) to detect overlaps more accurately than simple web search.

2. Model-backed scoring and customizable rubrics

  - Add the ability for institutions to define custom scoring rubrics and weights via the admin UI.
  - Optionally add a ML-backed scoring model (trained on historical faculty-graded projects) to complement heuristics.

3. Offline/On-premise model support

  - Provide an option to deploy and use local LLMs or embeddings services for institutions with data governance requirements.

4. Richer feedback artifacts

  - Generate annotated PDF reports with highlighted strengths/weaknesses, suggested modules, and inline comments for faculty.

5. Monitoring and observability

  - Add metrics (Prometheus/Grafana) for request latency, queue lengths, LLM call counts, and error rates.

6. User analytics and cohort insights

  - Provide dashboards that show common skill gaps, trending technologies, and cohort-level performance to inform curriculum improvements.

7. Automation & CI/CD

  - Add GitHub Actions workflows to run tests, static analysis, security scans, and to build Docker images for deployment.

8. Data export and integration

  - Add integrations to LMS (Moodle/Canvas) and SIS systems for syncing users, course enrollments, and grades.

9. Accessibility & localization

  - Improve the frontend for WCAG accessibility compliance and add i18n support for multi-language deployments.

10. Role-based dashboards and notifications

  - Add email or in-app notifications for submission events, review requests, and reminders for faculty reviewers.

