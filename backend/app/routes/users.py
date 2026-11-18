import csv
import io
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.core.security import hash_password
from app.database.database import get_db
from app.models.academic_profiles import FacultyProfile, StudentProfile
from app.models.university import Department, Program
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(
    prefix="/users",
    tags=["User Management & Administration"],
)


@router.get(
    "/roles/list",
    response_model=List[str],
)
def list_roles():
    return [role.value for role in UserRole]


@router.get(
    "/",
    response_model=List[UserResponse],
)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if department_id:
        query = query.filter(User.department_id == department_id)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((User.name.ilike(search_fmt)) | (User.email.ilike(search_fmt)))

    return query.order_by(User.id.desc()).offset(skip).limit(limit).all()


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user_admin(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value, UserRole.HOD.value])
    ),
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=user_in.role or UserRole.STUDENT.value,
        phone=user_in.phone,
        avatar=user_in.avatar,
        department_id=user_in.department_id,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Automatically create Student or Faculty profile
    if new_user.role in [UserRole.STUDENT.value, UserRole.TEAM_LEADER.value]:
        student_prof = StudentProfile(
            user_id=new_user.id,
            enrollment_number=f"ENR-{new_user.id:04d}",
            department_id=new_user.department_id,
        )
        db.add(student_prof)
    elif new_user.role in [UserRole.FACULTY.value, UserRole.HOD.value, UserRole.REVIEWER.value]:
        fac_prof = FacultyProfile(
            user_id=new_user.id,
            employee_id=f"EMP-{new_user.id:04d}",
            department_id=new_user.department_id,
        )
        db.add(fac_prof)
    db.commit()

    return new_user


@router.get(
    "/faculty/list",
    response_model=List[dict],
)
def list_faculty_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    faculty_users = (
        db.query(User)
        .filter(User.role.in_([UserRole.FACULTY.value, UserRole.HOD.value, UserRole.REVIEWER.value]))
        .order_by(User.name.asc())
        .all()
    )
    result = []
    for f in faculty_users:
        prof = f.faculty_profile
        result.append({
            "id": f.id,
            "name": f.name,
            "email": f.email,
            "role": f.role,
            "department_id": f.department_id,
            "department_name": f.department.name if f.department else None,
            "employee_id": prof.employee_id if prof else f"EMP-{f.id:04d}",
            "designation": prof.designation if prof else "Faculty",
            "current_project_load": prof.current_project_load if prof else 0,
            "max_project_load": prof.max_project_load if prof else 5,
        })
    return result


@router.get(
    "/students/list",
    response_model=List[dict],
)
def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(User).filter(User.role.in_([UserRole.STUDENT.value, UserRole.TEAM_LEADER.value]))
    if department_id:
        query = query.filter(User.department_id == department_id)

    students = query.order_by(User.id.desc()).offset(skip).limit(limit).all()
    result = []
    for s in students:
        prof = s.student_profile
        result.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "role": s.role,
            "department_id": s.department_id,
            "department_name": s.department.name if s.department else None,
            "enrollment_number": prof.enrollment_number if prof else f"ENR-{s.id:04d}",
            "program_name": prof.program.name if prof and prof.program else None,
            "cgpa": prof.cgpa if prof else 0.0,
            "academic_status": prof.academic_status if prof else "active",
        })
    return result


@router.get(
    "/export",
    response_class=StreamingResponse,
)
def export_users_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value, UserRole.HOD.value])
    ),
):
    users = db.query(User).order_by(User.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Role", "Department", "Is Active", "Created At"])

    for u in users:
        dept_name = u.department.name if u.department else "None"
        writer.writerow([u.id, u.name, u.email, u.role, dept_name, u.is_active, u.created_at.isoformat()])

    output.seek(0)
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
    )
    response.headers["Content-Disposition"] = "attachment; filename=devtrack_users_export.csv"
    return response


@router.post(
    "/bulk-import",
    response_model=dict,
)
def bulk_import_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value, UserRole.HOD.value])
    ),
):
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    created_count = 0
    skipped_count = 0
    errors = []

    default_pw = hash_password("Welcome@123")
    now = datetime.now(timezone.utc)

    for row_idx, row in enumerate(reader, start=1):
        name = row.get("name") or row.get("Name")
        email = row.get("email") or row.get("Email")
        role = (row.get("role") or row.get("Role") or "student").strip().lower()
        dept_code = (row.get("department_code") or row.get("dept") or "").strip().upper()

        if not name or not email:
            skipped_count += 1
            continue

        existing = db.query(User).filter(User.email == email.strip()).first()
        if existing:
            skipped_count += 1
            continue

        dept = None
        if dept_code:
            dept = db.query(Department).filter(Department.code == dept_code).first()

        try:
            user = User(
                name=name.strip(),
                email=email.strip(),
                password_hash=default_pw,
                role=role if role in [r.value for r in UserRole] else "student",
                department_id=dept.id if dept else None,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            if user.role in [UserRole.STUDENT.value, UserRole.TEAM_LEADER.value]:
                sp = StudentProfile(
                    user_id=user.id,
                    enrollment_number=row.get("enrollment_number") or f"ENR-{user.id:04d}",
                    department_id=user.department_id,
                )
                db.add(sp)
            elif user.role in [UserRole.FACULTY.value, UserRole.HOD.value, UserRole.REVIEWER.value]:
                fp = FacultyProfile(
                    user_id=user.id,
                    employee_id=row.get("employee_id") or f"EMP-{user.id:04d}",
                    department_id=user.department_id,
                )
                db.add(fp)
            db.commit()
            created_count += 1
        except Exception as e:
            db.rollback()
            errors.append(f"Row {row_idx}: {str(e)}")
            skipped_count += 1

    return {
        "message": f"Bulk import processed: {created_count} users created, {skipped_count} skipped.",
        "created_count": created_count,
        "skipped_count": skipped_count,
        "errors": errors[:5],
    }


@router.get(
    "/{user_id}",
    response_model=UserResponse,
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value, UserRole.HOD.value])
    ),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.put(
    "/{user_id}/status",
    response_model=dict,
)
def toggle_user_status(
    user_id: int,
    status_in: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value, UserRole.HOD.value])
    ),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "is_active" in status_in:
        user.is_active = bool(status_in["is_active"])
    if "role" in status_in and status_in["role"] in [r.value for r in UserRole]:
        user.role = status_in["role"]

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "User status updated", "user_id": user.id, "is_active": user.is_active, "role": user.role}


@router.delete(
    "/{user_id}",
    response_model=dict,
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value])
    ),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()
    return {"message": f"User {user.name} deleted successfully"}
