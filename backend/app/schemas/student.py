from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr


class StudentProfileBase(BaseModel):
    enrollment_number: str
    program_id: Optional[int] = None
    department_id: Optional[int] = None
    semester_id: Optional[int] = None
    section_id: Optional[int] = None
    batch_year: Optional[int] = None
    cgpa: float = 0.0
    academic_status: str = "active"


class StudentCreate(StudentProfileBase):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    program_id: Optional[int] = None
    department_id: Optional[int] = None
    semester_id: Optional[int] = None
    section_id: Optional[int] = None
    batch_year: Optional[int] = None
    cgpa: Optional[float] = None
    academic_status: Optional[str] = None


class StudentResponse(StudentProfileBase):
    id: int
    user_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_name: Optional[str] = None
    program_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BulkImportResult(BaseModel):
    total_processed: int
    success_count: int
    failed_count: int
    errors: List[str] = []
