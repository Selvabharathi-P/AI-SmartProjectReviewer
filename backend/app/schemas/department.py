from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    name: str
    code: str | None = None


class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str | None

    model_config = {"from_attributes": True}
