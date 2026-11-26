from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate


def create_project(
    db: Session,
    project_data: ProjectCreate,
    owner_id: int,
):
    # Auto-generate unique code safely even after deletions
    code = project_data.code
    if not code:
        max_id = db.query(func.max(Project.id)).scalar() or 0
        candidate_num = max(db.query(Project).count(), max_id) + 1
        while db.query(Project).filter(Project.code == f"PRJ-{candidate_num:04d}").first() is not None:
            candidate_num += 1
        code = f"PRJ-{candidate_num:04d}"

    project = Project(
        name=project_data.name,
        code=code,
        description=project_data.description,
        objectives=project_data.objectives,
        scope=project_data.scope,
        category=project_data.category or "Capstone",
        tech_stack=project_data.tech_stack or "React, Python, FastAPI, PostgreSQL",
        start_date=project_data.start_date or datetime.now(timezone.utc),
        deadline=project_data.deadline,
        priority=project_data.priority or "medium",
        status=project_data.status or "active",
        department_id=project_data.department_id,
        faculty_mentor_id=project_data.faculty_mentor_id,
        project_manager_id=project_data.project_manager_id,
        owner_id=owner_id,
        completion_percentage=0,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    # Automatically add owner as project member
    member = ProjectMember(
        project_id=project.id,
        user_id=owner_id,
        role_in_project="leader",
    )
    db.add(member)
    db.commit()

    return project
