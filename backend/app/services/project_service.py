from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate


def create_project(
    db: Session,
    project_data: ProjectCreate,
    owner_id: int,
):
    # Auto-generate unique code if not provided
    project_count = db.query(Project).count()
    code = project_data.code or f"PRJ-{project_count + 1:04d}"

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
