from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.student
    department_id: int | None = None
    id_number: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    department_id: int | None
    department: str | None = None   # department name, resolved by endpoint
    id_number: str | None = None
    is_active: bool = True

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserAdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.student
    department_id: int | None = None
    id_number: str


class UserAdminUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    id_number: str | None = None
    role: UserRole | None = None
    department_id: int | None = None
    is_active: bool | None = None
