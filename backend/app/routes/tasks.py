from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskResponse
from app.services.task_service import create_task, get_project_tasks


router = APIRouter(
    prefix="/projects",
    tags=["Tasks"],
)


def get_user_project(
    project_id: int,
    current_user: User,
    db: Session,
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    return project


@router.post(
    "/{project_id}/tasks",
    response_model=TaskResponse,
)
def add_task(
    project_id: int,
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id,
        current_user,
        db,
    )

    return create_task(
        db,
        task_data,
        project_id,
    )


@router.get(
    "/{project_id}/tasks",
    response_model=list[TaskResponse],
)
def list_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id,
        current_user,
        db,
    )

    return get_project_tasks(
        db,
        project_id,
    )


@router.delete(
    "/{project_id}/tasks/{task_id}",
)
def delete_task(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id,
        current_user,
        db,
    )

    task = (
        db.query(Task)
        .filter(
            Task.id == task_id,
            Task.project_id == project_id,
        )
        .first()
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    db.delete(task)
    db.commit()

    return {
        "message": "Task deleted successfully",
    }
