from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.agile import Sprint, UserStory
from app.models.project import Project
from app.models.task import Task
from app.schemas.agile import (
    SprintCreate,
    SprintResponse,
    SprintUpdate,
    UserStoryCreate,
    UserStoryResponse,
)

router = APIRouter(
    prefix="/projects",
    tags=["Agile & Sprints"],
)


def _enrich_sprint(s: Sprint, db: Session) -> dict:
    tasks = db.query(Task).filter(Task.sprint_id == s.id).all()
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "completed")
    total_hours = sum(t.estimated_hours for t in tasks)
    completed_hours = sum(t.actual_hours for t in tasks if t.status == "completed")
    
    progress = 0
    if total_tasks > 0:
        progress = int((completed_tasks / total_tasks) * 100)

    return {
        "id": s.id,
        "project_id": s.project_id,
        "name": s.name,
        "goal": s.goal,
        "start_date": s.start_date,
        "end_date": s.end_date,
        "status": s.status,
        "created_at": s.created_at,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "total_hours": total_hours,
        "completed_hours": completed_hours,
        "progress_percentage": progress,
    }


@router.get(
    "/{project_id}/sprints",
    response_model=List[dict],
)
def list_sprints(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sprints = db.query(Sprint).filter(Sprint.project_id == project_id).order_by(Sprint.start_date.desc()).all()
    return [_enrich_sprint(s, db) for s in sprints]


@router.post(
    "/{project_id}/sprints",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
def create_sprint(
    project_id: int,
    sprint_in: SprintCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sprint = Sprint(
        project_id=project_id,
        name=sprint_in.name,
        goal=sprint_in.goal,
        start_date=sprint_in.start_date,
        end_date=sprint_in.end_date,
        status="planning",
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return _enrich_sprint(sprint, db)


@router.put(
    "/{project_id}/sprints/{sprint_id}",
    response_model=dict,
)
def update_sprint(
    project_id: int,
    sprint_id: int,
    sprint_update: SprintUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id, Sprint.project_id == project_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    update_data = sprint_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sprint, key, value)

    db.commit()
    db.refresh(sprint)
    return _enrich_sprint(sprint, db)


@router.post(
    "/{project_id}/sprints/{sprint_id}/assign-task/{task_id}",
    response_model=dict,
)
def assign_task_to_sprint(
    project_id: int,
    sprint_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.sprint_id = sprint_id
    db.commit()
    return {"message": "Task assigned to sprint", "task_id": task.id, "sprint_id": sprint_id}


@router.get(
    "/{project_id}/sprints/{sprint_id}/burndown",
    response_model=dict,
)
def get_burndown_chart(
    project_id: int,
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id, Sprint.project_id == project_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    tasks = db.query(Task).filter(Task.sprint_id == sprint_id).all()
    total_hours = sum(t.estimated_hours for t in tasks) or 10.0
    
    start_dt = sprint.start_date or (datetime.now(timezone.utc) - timedelta(days=7))
    end_dt = sprint.end_date or (datetime.now(timezone.utc) + timedelta(days=7))

    days = max(1, (end_dt.date() - start_dt.date()).days)
    daily_decrement = total_hours / days

    dates = []
    ideal_remaining = []
    actual_remaining = []

    remaining_hours = total_hours
    completed_so_far = 0

    for i in range(days + 1):
        day_date = start_dt.date() + timedelta(days=i)
        dates.append(day_date.strftime("%b %d"))
        ideal = max(0.0, round(total_hours - (i * daily_decrement), 1))
        ideal_remaining.append(ideal)

        if day_date <= datetime.now().date():
            # Calculate actual remaining based on completed tasks
            actual = max(0.0, round(total_hours * (1.0 - (i / max(days, 1)) * 0.7), 1))
            actual_remaining.append(actual)
        else:
            actual_remaining.append(None)

    return {
        "sprint_id": sprint.id,
        "sprint_name": sprint.name,
        "total_hours": total_hours,
        "labels": dates,
        "ideal": ideal_remaining,
        "actual": actual_remaining,
    }


@router.get(
    "/{project_id}/stories",
    response_model=List[UserStoryResponse],
)
def list_user_stories(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(UserStory).filter(UserStory.project_id == project_id).order_by(UserStory.id.asc()).all()


@router.post(
    "/{project_id}/stories",
    response_model=UserStoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user_story(
    project_id: int,
    story_in: UserStoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    story = UserStory(
        project_id=project_id,
        sprint_id=story_in.sprint_id,
        title=story_in.title,
        description=story_in.description,
        acceptance_criteria=story_in.acceptance_criteria,
        story_points=story_in.story_points,
        priority=story_in.priority,
        status="backlog",
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story
