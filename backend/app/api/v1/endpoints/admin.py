from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.department import Department
from app.models.user import User, UserRole
from app.schemas.department import DepartmentCreate, DepartmentOut
from app.schemas.user import UserOut, UserAdminUpdate
from app.core.deps import require_role

router = APIRouter(tags=["admin"])


# ── Departments ────────────────────────────────────────────────

@router.get("/departments", response_model=list[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()


@router.post("/departments", response_model=DepartmentOut, status_code=201)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    existing = await db.execute(select(Department).where(Department.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Department already exists")
    dept = Department(name=payload.name, code=payload.code)
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}", status_code=204)
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    await db.delete(dept)
    await db.commit()


# ── Users ──────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [await _enrich_user(u, db) for u in users]


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_role(UserRole.admin)),
):
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role is not None:
        user.role = payload.role
    if payload.department_id is not None:
        user.department_id = payload.department_id
    await db.commit()
    await db.refresh(user)
    return await _enrich_user(user, db)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_role(UserRole.admin)),
):
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()


async def _enrich_user(user: User, db: AsyncSession) -> UserOut:
    dept_name: str | None = None
    if user.department_id:
        res = await db.execute(select(Department).where(Department.id == user.department_id))
        dept = res.scalar_one_or_none()
        dept_name = dept.name if dept else None
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        department_id=user.department_id,
        department=dept_name,
        id_number=user.id_number,
    )
