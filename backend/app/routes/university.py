from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.database.database import get_db
from app.models.university import (
    AcademicSession,
    Department,
    Program,
    School,
    Section,
    Semester,
    UniversityProfile,
)
from app.models.user import UserRole
from app.schemas.university import (
    AcademicSessionResponse,
    DepartmentCreate,
    DepartmentResponse,
    ProgramCreate,
    ProgramResponse,
    SchoolResponse,
    SectionResponse,
    SemesterResponse,
    UniversityProfileResponse,
)

router = APIRouter(
    prefix="/university",
    tags=["University Administration"],
)


@router.get(
    "/profile",
    response_model=UniversityProfileResponse,
)
def get_university_profile(db: Session = Depends(get_db)):
    profile = db.query(UniversityProfile).first()
    if not profile:
        profile = UniversityProfile(
            name="Apex Global Technological University",
            code="AGTU",
            contact_email="admin@devtrack.edu",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get(
    "/schools",
    response_model=List[SchoolResponse],
)
def list_schools(db: Session = Depends(get_db)):
    return db.query(School).order_by(School.id.asc()).all()


@router.get(
    "/departments",
    response_model=List[DepartmentResponse],
)
def list_departments(
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Department)
    if school_id:
        query = query.filter(Department.school_id == school_id)
    return query.order_by(Department.id.asc()).all()


@router.post(
    "/departments",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value])),
):
    existing = db.query(Department).filter(Department.code == dept_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists")

    dept = Department(**dept_data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get(
    "/programs",
    response_model=List[ProgramResponse],
)
def list_programs(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Program)
    if department_id:
        query = query.filter(Program.department_id == department_id)
    return query.order_by(Program.id.asc()).all()


@router.post(
    "/programs",
    response_model=ProgramResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_program(
    prog_data: ProgramCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value, UserRole.HOD.value])),
):
    prog = Program(**prog_data.model_dump())
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return prog


@router.get(
    "/sessions",
    response_model=List[AcademicSessionResponse],
)
def list_sessions(db: Session = Depends(get_db)):
    return db.query(AcademicSession).order_by(AcademicSession.id.desc()).all()


@router.get(
    "/semesters",
    response_model=List[SemesterResponse],
)
def list_semesters(
    program_id: Optional[int] = None,
    academic_session_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Semester)
    if program_id:
        query = query.filter(Semester.program_id == program_id)
    if academic_session_id:
        query = query.filter(Semester.academic_session_id == academic_session_id)
    return query.order_by(Semester.semester_number.asc()).all()


@router.get(
    "/sections",
    response_model=List[SectionResponse],
)
def list_sections(
    semester_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Section)
    if semester_id:
        query = query.filter(Section.semester_id == semester_id)
    return query.order_by(Section.name.asc()).all()
