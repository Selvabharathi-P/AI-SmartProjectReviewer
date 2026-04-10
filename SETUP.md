# Setup Guide

---

## Prerequisites

| Tool | Min Version | Purpose |
|---|---|---|
| Docker Desktop | 24+ | Container runtime |
| Docker Compose | v2 (plugin) | Multi-service orchestration |
| Node.js | 20+ | Frontend (non-Docker only) |
| Python | 3.11+ | Backend (non-Docker only) |
| Git | any | Clone repo |

---

## Option A — Docker (Recommended)

### 1. Clone the repository

```bash
git clone <repo-url>
cd smart-project-review-and-eval
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in the required values:

```env
# Required — get free keys at:
#   Mistral AI: https://console.mistral.ai
#   Serper:     https://serper.dev

MISTRAL_API_KEY=your_mistral_api_key_here
SERPER_API_KEY=your_serper_api_key_here

# These work as-is with Docker Compose — only change if needed
DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/smart_eval
REDIS_URL=redis://redis:6379/0
SECRET_KEY=change-this-to-a-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
MISTRAL_MODEL=mistral-small-latest
```

### 3. Build and start

```bash
docker compose up --build
```

First build takes 3–5 minutes (downloads Python packages + spaCy model).  
Subsequent starts are fast (images are cached).

### 4. Access the app

| URL | Description |
|---|---|
| http://localhost:3000 | Frontend |
| http://localhost:8000/docs | Backend Swagger UI |
| http://localhost:8000/health | Health check |

### 5. Stop

```bash
docker compose down          # stop containers, keep DB data
docker compose down -v       # stop + wipe DB volume (fresh start)
```

---

## Option B — Manual Setup

### Backend

```bash
cd backend

# Create and activate virtualenv
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Set env (copy and edit)
cp .env.example .env

# Start PostgreSQL and Redis separately (or use Docker just for infra):
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=smart_eval postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Set env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# Start dev server
npm run dev
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL async connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `SECRET_KEY` | Yes | — | JWT signing secret (use a random 32+ char string in prod) |
| `ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `480` | JWT TTL in minutes |
| `MISTRAL_API_KEY` | Yes | — | Mistral AI API key |
| `MISTRAL_MODEL` | No | `mistral-small-latest` | Mistral model name |
| `SERPER_API_KEY` | Yes | — | Serper (Google Search) API key |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000/api/v1` | Backend API base URL |

---

## Database

Tables are created automatically on first startup — no migration command needed.

To run Alembic migrations manually:

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## Rebuilding After Code Changes

```bash
# Rebuild only the changed service
docker compose build backend
docker compose up backend -d

# Or rebuild everything
docker compose up --build
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Frontend shows blank page / no styles | Missing `postcss.config.js` | Already included in repo — rebuild frontend |
| `bcrypt` error on register | Old passlib/bcrypt | `requirements.txt` now uses `bcrypt==4.2.0` directly |
| `operator does not exist: integer = varchar` | JWT sub not cast to int | Fixed in `deps.py` with `int(payload.get("sub"))` |
| Frontend starts before backend ready | No healthcheck | `docker-compose.yml` now uses `condition: service_healthy` |
| Mistral/Serper errors | Missing API keys | Fill in `backend/.env` |
