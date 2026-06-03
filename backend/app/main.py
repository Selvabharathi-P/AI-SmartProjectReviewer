from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.db.session import engine
from app.db.base import Base
from app.db.seed import seed_admin
from app.db.schema_sync import ensure_schema
import app.db.all_models  # noqa — register all models before create_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # create_all adds new tables but can't alter existing ones; this patches
    # additive column/enum changes onto already-existing databases.
    await ensure_schema()
    await seed_admin()
    yield


app = FastAPI(
    title="Smart Project Review & Evaluation System",
    description="AI-powered project evaluation for final year students",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
