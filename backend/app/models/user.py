from sqlalchemy import Column, Integer, String, Enum, DateTime, func
from app.db.base import Base
import enum


class UserRole(str, enum.Enum):
    student = "student"
    faculty = "faculty"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)
    department = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
