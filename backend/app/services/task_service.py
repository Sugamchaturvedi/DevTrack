from sqlalchemy.orm import Session
from app.models.task import Task, TaskComment
from app.models.project import Project
from app.schemas.task import TaskCreate, TaskUpdate


def create_task(
    db: Session,
    task_data: TaskCreate,
    project_id: int,
    assigned_by_id: int = None,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    key_prefix = (project.code if project and project.code else "DEV").upper()

    task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status or "todo",
        priority=task_data.priority or "medium",
        project_id=project_id,
        issue_key=task_data.issue_key,
        issue_type=task_data.issue_type or "task",
        epic_id=task_data.epic_id,
        reporter_id=assigned_by_id,
        story_points=task_data.story_points or 0,
        labels=task_data.labels,
        order_rank=task_data.order_rank or 0.0,
        assigned_to_id=task_data.assigned_to_id,
        assigned_by_id=assigned_by_id,
        team_id=task_data.team_id,
        sprint_id=task_data.sprint_id,
        parent_task_id=task_data.parent_task_id,
        due_date=task_data.due_date,
        estimated_hours=task_data.estimated_hours or 0.0,
    )

    db.add(task)
    db.flush()

    # Auto-generate issue key if not provided
    if not task.issue_key:
        task.issue_key = f"{key_prefix}-{1000 + task.id}"

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
        .order_by(Task.order_rank.asc(), Task.id.desc())
        .all()
    )


def update_task_status(
    db: Session,
    task_id: int,
    status: str,
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task:
        task.status = status
        if status in ["completed", "done"]:
            task.progress_percentage = 100
        db.commit()
        db.refresh(task)
    return task
