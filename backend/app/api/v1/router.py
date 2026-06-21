from fastapi import APIRouter
from app.api.v1.endpoints import auth, projects, evaluations, admin, meetings

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(evaluations.router)
api_router.include_router(admin.router)
api_router.include_router(meetings.router)
