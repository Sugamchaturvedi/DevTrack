from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.database.database import get_db
from app.models.project import Project, ProjectMember, ProjectMilestone, ProjectTeam
from app.models.task import Task
from app.models.user import User, UserRole
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberSchema,
    ProjectMilestoneSchema,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.project_service import create_project

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
)


def _enrich_project(p: Project, db: Session) -> dict:
    total_tasks = db.query(Task).filter(Task.project_id == p.id).count()
    completed_tasks = db.query(Task).filter(Task.project_id == p.id, Task.status == "completed").count()

    owner_name = p.owner.name if p.owner else "Unknown"
    dept_name = p.department.name if p.department else None
    mentor_name = p.faculty_mentor.name if p.faculty_mentor else None
    pm_name = p.project_manager.name if p.project_manager else None

    # Calculate completion percentage from tasks if tasks exist
    pct = p.completion_percentage
    if total_tasks > 0:
        pct = int((completed_tasks / total_tasks) * 100)

    return {
        "id": p.id,
        "name": p.name,
        "code": p.code,
        "description": p.description,
        "objectives": p.objectives,
        "scope": p.scope,
        "category": p.category,
        "tech_stack": p.tech_stack,
        "start_date": p.start_date,
        "deadline": p.deadline,
        "priority": p.priority,
        "status": p.status,
        "owner_id": p.owner_id,
        "owner_name": owner_name,
        "department_id": p.department_id,
        "department_name": dept_name,
        "faculty_mentor_id": p.faculty_mentor_id,
        "faculty_mentor_name": mentor_name,
        "project_manager_id": p.project_manager_id,
        "project_manager_name": pm_name,
        "completion_percentage": pct,
        "repo_url": p.repo_url,
        "live_demo_url": p.live_demo_url,
        "task_count": total_tasks,
        "completed_task_count": completed_tasks,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = create_project(
        db=db,
        project_data=project_data,
        owner_id=current_user.id,
    )

    if project is None:
        raise HTTPException(
            status_code=500,
            detail="Project was not created",
        )

    return _enrich_project(project, db)


@router.get("", response_model=List[ProjectResponse])
@router.get(
    "/",
    response_model=List[ProjectResponse],
)
def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    all_projects: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Project)

    # University Admin / Super Admin can see all projects
    if current_user.role in [UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value]:
        pass
    elif current_user.role in [UserRole.HOD.value, UserRole.REVIEWER.value, UserRole.FACULTY.value]:
        from sqlalchemy import or_
        member_proj_ids = [m.project_id for m in db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).all()]
        access_conditions = [
            Project.owner_id == current_user.id,
            Project.faculty_mentor_id == current_user.id,
            Project.project_manager_id == current_user.id,
        ]
        if member_proj_ids:
            access_conditions.append(Project.id.in_(member_proj_ids))
        if current_user.department_id:
            access_conditions.append(Project.department_id == current_user.department_id)
            access_conditions.append(Project.department_id.is_(None))
        query = query.filter(or_(*access_conditions))
    elif not all_projects:
        # User sees projects they own, mentor, manage, or are a member of
        member_proj_ids = [m.project_id for m in db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).all()]
        query = query.filter(
            (Project.owner_id == current_user.id)
            | (Project.faculty_mentor_id == current_user.id)
            | (Project.project_manager_id == current_user.id)
            | (Project.id.in_(member_proj_ids))
        )

    if status_filter:
        query = query.filter(Project.status == status_filter)
    if category:
        query = query.filter(Project.category == category)
    if department_id:
        query = query.filter(Project.department_id == department_id)
    if search:
        s = f"%{search}%"
        query = query.filter((Project.name.ilike(s)) | (Project.code.ilike(s)) | (Project.description.ilike(s)))

    projects = query.order_by(Project.id.desc()).offset(skip).limit(limit).all()
    return [_enrich_project(p, db) for p in projects]


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return _enrich_project(project, db)


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only owner, faculty mentor, project manager, HOD, or admin can update
    allowed_roles = [UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value, UserRole.HOD.value]
    if (
        current_user.id not in [project.owner_id, project.faculty_mentor_id, project.project_manager_id]
        and current_user.role not in allowed_roles
    ):
        raise HTTPException(status_code=403, detail="Permission denied to update this project")

    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return _enrich_project(project, db)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.id != project.owner_id and current_user.role not in [
        UserRole.SUPER_ADMIN.value,
        UserRole.UNIVERSITY_ADMIN.value,
        UserRole.HOD.value,
    ]:
        raise HTTPException(status_code=403, detail="Permission denied to delete this project")

    db.delete(project)
    db.commit()
    return None


@router.get(
    "/{project_id}/members",
    response_model=List[ProjectMemberSchema],
)
def list_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    results = []
    for m in members:
        results.append({
            "id": m.id,
            "project_id": m.project_id,
            "user_id": m.user_id,
            "user_name": m.user.name if m.user else "Unknown",
            "user_email": m.user.email if m.user else None,
            "role_in_project": m.role_in_project,
            "joined_at": m.joined_at,
        })
    return results


@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberSchema,
)
def add_project_member(
    project_id: int,
    user_id: int,
    role_in_project: str = "member",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this project")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    member = ProjectMember(
        project_id=project_id,
        user_id=user_id,
        role_in_project=role_in_project,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return {
        "id": member.id,
        "project_id": member.project_id,
        "user_id": member.user_id,
        "user_name": user.name,
        "user_email": user.email,
        "role_in_project": member.role_in_project,
        "joined_at": member.joined_at,
    }


@router.delete(
    "/{project_id}/members/{user_id}",
    response_model=dict,
)
def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")

    db.delete(member)
    db.commit()
    return {"message": "Member removed successfully"}


@router.get(
    "/export/csv",
    tags=["Projects"],
)
def export_projects_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import csv
    import io
    from fastapi.responses import StreamingResponse

    projects = db.query(Project).order_by(Project.id.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Code", "Name", "Category", "Status", "Priority", "Owner", "Department", "Progress %", "Deadline"])

    for p in projects:
        owner_name = p.owner.name if p.owner else "None"
        dept_name = p.department.name if p.department else "None"
        deadline_str = p.deadline.isoformat() if p.deadline else ""
        writer.writerow([p.id, p.code or "", p.name, p.category, p.status, p.priority, owner_name, dept_name, p.completion_percentage, deadline_str])

    output.seek(0)
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
    )
    response.headers["Content-Disposition"] = "attachment; filename=devtrack_projects_export.csv"
    return response


@router.get(
    "/{project_id}/milestones",
    response_model=List[ProjectMilestoneSchema],
)
def list_milestones(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id).order_by(ProjectMilestone.id.asc()).all()


@router.post(
    "/{project_id}/milestones",
    response_model=ProjectMilestoneSchema,
)
def create_milestone(
    project_id: int,
    title: str,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestone = ProjectMilestone(
        project_id=project_id,
        title=title,
        description=description,
        status="pending",
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone
