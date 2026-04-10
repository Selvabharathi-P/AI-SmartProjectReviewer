# Sequence & Flow Diagrams

All diagrams use [Mermaid](https://mermaid.js.org/) syntax — render them on GitHub, VS Code (Mermaid Preview extension), or [mermaid.live](https://mermaid.live).

---

## 1. User Registration

```mermaid
sequenceDiagram
    actor Student
    participant FE as Frontend (Next.js)
    participant BE as Backend (FastAPI)
    participant DB as PostgreSQL

    Student->>FE: Fill register form (name, email, password, role)
    FE->>FE: Zod validation
    FE->>BE: POST /api/v1/auth/register
    BE->>DB: SELECT user WHERE email = ?
    DB-->>BE: null (not found)
    BE->>BE: bcrypt.hashpw(password)
    BE->>DB: INSERT INTO users (...)
    DB-->>BE: User row
    BE-->>FE: 201 UserOut {id, full_name, email, role}
    FE->>FE: toast.success("Account created!")
    FE->>FE: router.push("/login")
    FE-->>Student: Redirect to Login page
```

---

## 2. User Login

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant LS as localStorage

    User->>FE: Enter email + password
    FE->>BE: POST /api/v1/auth/login
    BE->>DB: SELECT user WHERE email = ?
    DB-->>BE: User row
    BE->>BE: bcrypt.checkpw(password, hash)
    BE->>BE: jwt.encode({sub: str(user.id), role})
    BE-->>FE: {access_token, user}
    FE->>LS: localStorage.setItem("token", access_token)
    FE->>FE: zustand.setAuth(user, token)
    FE->>FE: toast.success("Welcome back!")
    alt role == "student"
        FE-->>User: Redirect /student/dashboard
    else role == "faculty"
        FE-->>User: Redirect /faculty/dashboard
    end
```

---

## 3. Project Submission & AI Evaluation

```mermaid
sequenceDiagram
    actor Student
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant AI as AI Pipeline
    participant Mistral as Mistral AI
    participant Serper as Serper API

    Student->>FE: Fill submission form
    FE->>BE: POST /api/v1/projects/ {title, description, modules, technologies...}
    Note over BE: JWT → user_id

    BE->>DB: INSERT INTO projects (status="pending")
    DB-->>BE: Project row

    BE->>BE: BackgroundTask: run_ai_evaluation(project)
    BE->>DB: UPDATE projects SET status="analyzing"
    BE-->>FE: 201 ProjectOut {id, status: "analyzing"}

    FE->>FE: router.push(/student/dashboard)
    FE->>FE: toast.success("Project submitted!")

    Note over FE,DB: Frontend polls GET /evaluations/{id} every 4s

    par AI Pipeline (background)
        AI->>AI: score_title()
        AI->>AI: score_description()
        AI->>AI: score_modules()
        AI->>AI: score_technologies()
        AI->>AI: score_innovation() [Sentence Transformers]
        AI->>AI: score_feasibility()
        AI->>AI: compute_total_score() [weighted avg]
        AI->>AI: extract_keywords() [spaCy]
        AI->>AI: match_skills() [Sentence Transformers]
        AI->>Mistral: Generate AI feedback
        Mistral-->>AI: Markdown feedback
        AI->>Mistral: Suggest additional modules
        Mistral-->>AI: JSON module list
        AI->>Serper: Search related papers + similar projects
        Serper-->>AI: [{title, url, snippet}]
        AI->>Mistral: Analyze originality
        Mistral-->>AI: Originality verdict
        AI->>DB: UPSERT evaluations (...)
        AI->>DB: UPDATE projects SET status="reviewed"
    end

    FE->>BE: GET /api/v1/evaluations/{project_id}
    BE->>DB: SELECT evaluation WHERE project_id = ?
    DB-->>BE: Evaluation row
    BE-->>FE: EvaluationOut
    FE-->>Student: Display scores, feedback, charts, papers
```

---

## 4. Faculty Review

```mermaid
sequenceDiagram
    actor Faculty
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    Faculty->>FE: Open /faculty/submissions
    FE->>BE: GET /api/v1/projects/
    BE->>DB: SELECT projects (all)
    DB-->>BE: Project[]
    BE-->>FE: ProjectOut[]
    FE-->>Faculty: Project list with statuses

    Faculty->>FE: Click project → /faculty/review/{id}
    FE->>BE: GET /api/v1/projects/{id}
    FE->>BE: GET /api/v1/evaluations/{id}
    BE->>DB: SELECT project, evaluation
    DB-->>BE: data
    BE-->>FE: ProjectOut + EvaluationOut
    FE-->>Faculty: AI scores, radar chart, feedback, related papers

    Faculty->>FE: Enter score, remarks → click "Select"
    FE->>BE: PATCH /api/v1/evaluations/{id}/faculty-review
    Note over FE: {faculty_score, faculty_remarks, is_finalized: true, project_status: "selected"}
    BE->>DB: UPDATE evaluations SET faculty_score, faculty_remarks, is_finalized=true
    BE->>DB: UPDATE projects SET status="selected"
    DB-->>BE: updated rows
    BE-->>FE: EvaluationOut
    FE->>FE: toast.success("Review submitted!")
    FE-->>Faculty: Updated project status badge
```

---

## 5. Student Viewing Feedback

```mermaid
sequenceDiagram
    actor Student
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    Student->>FE: Open dashboard → click project card
    FE->>BE: GET /api/v1/projects/{id}
    FE->>BE: GET /api/v1/evaluations/{id}

    alt status == "analyzing"
        loop Poll every 4s (max 5 retries)
            FE->>BE: GET /api/v1/evaluations/{id}
            BE-->>FE: 404 or partial data
        end
    else status == "reviewed" or "selected" etc.
        BE->>DB: SELECT evaluation
        DB-->>BE: Full evaluation
        BE-->>FE: EvaluationOut
        FE-->>Student: Score breakdown + radar chart
        FE-->>Student: AI narrative feedback (Markdown)
        FE-->>Student: Keyword cloud
        FE-->>Student: Missing skills list
        FE-->>Student: Suggested modules
        FE-->>Student: Related papers + similar projects
        FE-->>Student: Originality verdict
        FE-->>Student: Faculty score + remarks (if finalized)
    end
```

---

## 6. Full System Data Flow

```mermaid
flowchart TD
    subgraph Browser
        A[Student / Faculty]
    end

    subgraph Frontend["Frontend (Next.js :3000)"]
        B[Auth Pages]
        C[Student Pages]
        D[Faculty Pages]
        E[Zustand Store]
        F[TanStack Query Cache]
        G[Axios Client + JWT]
    end

    subgraph Backend["Backend (FastAPI :8000)"]
        H[Auth Router]
        I[Projects Router]
        J[Evaluations Router]
        K[JWT Middleware]
        L[AI Evaluation Service]
    end

    subgraph AI["AI Layer"]
        M[Scorer - Rule-based]
        N[NLP - spaCy]
        O[Skill Matcher - SentenceTransformers]
        P[Mistral Client]
        Q[Serper Client]
    end

    subgraph Infra["Infrastructure"]
        R[(PostgreSQL)]
        S[(Redis)]
    end

    subgraph External["External APIs"]
        T[Mistral AI]
        U[Serper / Google]
    end

    A --> B & C & D
    B & C & D --> G
    G --> K
    K --> H & I & J
    H --> R
    I --> R
    I -->|BackgroundTask| L
    J --> R
    L --> M & N & O & P & Q
    P --> T
    Q --> U
    L --> R
    E --> C & D
    F --> C & D
```

---

## 7. Project Status State Machine

```mermaid
stateDiagram-v2
    [*] --> pending : Student submits project

    pending --> analyzing : Background AI task starts
    analyzing --> reviewed : AI evaluation complete

    reviewed --> selected : Faculty selects project
    reviewed --> rejected : Faculty rejects project
    reviewed --> waiting : Faculty waitlists project

    selected --> [*]
    rejected --> [*]
    waiting --> reviewed : Faculty re-reviews
```
