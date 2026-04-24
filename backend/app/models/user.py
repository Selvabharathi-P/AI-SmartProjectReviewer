from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, func
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
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    id_number = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
