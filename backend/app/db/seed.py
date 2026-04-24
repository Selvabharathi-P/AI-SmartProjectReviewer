from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password
from app.core.config import settings


async def seed_admin() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        if result.scalar_one_or_none():
            return

        admin = User(
            full_name=settings.ADMIN_FULL_NAME,
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role=UserRole.admin,
            id_number=settings.ADMIN_ID_NUMBER,
        )
        db.add(admin)
        await db.commit()
        print(f"[seed] Admin user created: {settings.ADMIN_EMAIL}")
