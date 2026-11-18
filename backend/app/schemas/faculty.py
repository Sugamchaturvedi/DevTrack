from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class FacultyProfileBase(BaseModel):
    employee_id: str
    department_id: Optional[int] = None
    designation: str = "Assistant Professor"
    specialization: Optional[str] = None
    max_project_load: int = 5


class FacultyCreate(FacultyProfileBase):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    max_project_load: Optional[int] = None


class FacultyResponse(FacultyProfileBase):
    id: int
    user_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_name: Optional[str] = None
    current_project_load: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
