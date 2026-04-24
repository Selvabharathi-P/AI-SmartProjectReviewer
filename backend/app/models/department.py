from sqlalchemy import Column, Integer, String, DateTime, func
from app.db.base import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
