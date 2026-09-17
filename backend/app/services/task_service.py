from sqlalchemy.orm import Session

from app.models.task import Task
from app.schemas.task import TaskCreate


def create_task(
    db: Session,
    task_data: TaskCreate,
    project_id: int,
):
    task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        project_id=project_id,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


def get_project_tasks(
    db: Session,
    project_id: int,
):
    return (
        db.query(Task)
        .filter(Task.project_id == project_id)
        .all()
    )