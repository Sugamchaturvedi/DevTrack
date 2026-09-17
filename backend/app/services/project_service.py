from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreate


def create_project(
    db: Session,
    project_data: ProjectCreate,
    owner_id: int,
):
    project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=owner_id,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return project