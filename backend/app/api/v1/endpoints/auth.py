from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenOut
from app.models.user import User
from app.models.department import Department
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


async def _user_out(user: User, db: AsyncSession) -> UserOut:
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


@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        department_id=payload.department_id,
        id_number=payload.id_number,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _user_out(user, db)


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenOut(access_token=token, user=await _user_out(user, db))
