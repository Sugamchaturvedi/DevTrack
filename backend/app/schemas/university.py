from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class UniversityProfileBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


class UniversityProfileResponse(UniversityProfileBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SchoolBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    dean_name: Optional[str] = None


class SchoolResponse(SchoolBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    school_id: Optional[int] = None
    hod_id: Optional[int] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProgramBase(BaseModel):
    name: str
    code: str
    degree_type: str = "B.Tech"
    duration_years: int = 4
    department_id: int


class ProgramCreate(ProgramBase):
    pass


class ProgramResponse(ProgramBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AcademicSessionBase(BaseModel):
    name: str
    start_year: int
    end_year: int
    is_current: bool = True


class AcademicSessionResponse(AcademicSessionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SemesterBase(BaseModel):
    program_id: int
    academic_session_id: int
    semester_number: int
    name: str


class SemesterResponse(SemesterBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SectionBase(BaseModel):
    semester_id: int
    name: str
    batch_year: int


class SectionResponse(SectionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
