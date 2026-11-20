from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.project import Project, ProjectMember
from app.models.task import Task, TaskComment
from app.models.user import User, UserRole
from app.schemas.task import (
    KanbanBoardResponse,
    KanbanLane,
    TaskCommentCreate,
    TaskCommentResponse,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.services.task_service import create_task, get_project_tasks

router = APIRouter(
    prefix="/projects",
    tags=["Tasks"],
)


def _enrich_task(t: Task) -> dict:
    return {
        "id": t.id,
        "issue_key": t.issue_key or f"DEV-{1000 + t.id}",
        "issue_type": t.issue_type or "task",
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "priority": t.priority,
        "project_id": t.project_id,
        "assigned_to_id": t.assigned_to_id,
        "assigned_to_name": t.assigned_to.name if t.assigned_to else None,
        "assigned_by_id": t.assigned_by_id,
        "assigned_by_name": t.assigned_by.name if t.assigned_by else None,
        "reporter_id": t.reporter_id,
        "reporter_name": t.reporter.name if t.reporter else (t.assigned_by.name if t.assigned_by else None),
        "epic_id": t.epic_id,
        "epic_title": t.epic.title if t.epic else None,
        "story_points": t.story_points or 0,
        "labels": t.labels,
        "order_rank": t.order_rank or 0.0,
        "project_name": t.project.name if t.project else None,
        "team_id": t.team_id,
        "sprint_id": t.sprint_id,
        "parent_task_id": t.parent_task_id,
        "start_date": t.start_date,
        "due_date": t.due_date,
        "estimated_hours": t.estimated_hours,
        "actual_hours": t.actual_hours,
        "progress_percentage": t.progress_percentage,
        "subtask_count": len(t.subtasks) if t.subtasks else 0,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
    }


def get_user_project(
    project_id: int,
    current_user: User,
    db: Session,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    # Check permission: owner, mentor, manager, member, faculty in dept, or admin
    is_owner = project.owner_id == current_user.id
    is_mentor = project.faculty_mentor_id == current_user.id
    is_manager = project.project_manager_id == current_user.id
    is_admin = current_user.role in [UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value, UserRole.HOD.value]
    is_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
    ).first() is not None
    is_faculty_in_dept = (
        current_user.role in [UserRole.FACULTY.value, UserRole.REVIEWER.value, UserRole.HOD.value]
        and (project.department_id == current_user.department_id or project.department_id is None)
    )

    if not (is_owner or is_mentor or is_manager or is_admin or is_member or is_faculty_in_dept):
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access tasks for this project",
        )

    return project


@router.post(
    "/{project_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
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

    task = create_task(
        db,
        task_data,
        project_id,
        assigned_by_id=current_user.id,
    )
    return _enrich_task(task)


@router.get(
    "/{project_id}/tasks",
    response_model=List[TaskResponse],
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

    tasks = get_project_tasks(
        db,
        project_id,
    )
    return [_enrich_task(t) for t in tasks]


@router.get(
    "/{project_id}/tasks/kanban",
    response_model=KanbanBoardResponse,
)
def get_kanban_board(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_user_project(project_id, current_user, db)
    tasks = db.query(Task).filter(Task.project_id == project_id).order_by(Task.order_rank.asc(), Task.id.desc()).all()

    statuses = [
        ("open", "Open", "todo", "#94a3b8", 0),
        ("todo", "To Do", "todo", "#3b82f6", 0),
        ("in_progress", "In Progress", "in_progress", "#f59e0b", 5),
        ("blocked", "Blocked", "in_progress", "#ef4444", 0),
        ("in_review", "In Review", "in_progress", "#8b5cf6", 3),
        ("testing", "Testing", "in_progress", "#06b6d4", 4),
        ("done", "Done", "done", "#10b981", 0),
    ]

    lanes = []
    for s_code, s_label, s_cat, s_color, s_wip in statuses:
        lane_tasks = []
        for t in tasks:
            status_val = (t.status or "todo").lower()
            if status_val == "completed":
                status_val = "done"
            elif status_val == "backlog":
                status_val = "open"
            
            if status_val == s_code:
                lane_tasks.append(_enrich_task(t))

        total_pts = sum(t.get("story_points", 0) for t in lane_tasks)
        lanes.append({
            "status": s_code,
            "title": s_label,
            "category": s_cat,
            "color": s_color,
            "wip_limit": s_wip,
            "total_story_points": total_pts,
            "tasks": lane_tasks,
        })

    return {
        "project_id": project.id,
        "project_name": project.name,
        "lanes": lanes,
    }


@router.put(
    "/{project_id}/tasks/{task_id}",
    response_model=TaskResponse,
)
def update_task(
    project_id: int,
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(project_id, current_user, db)

    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    if task_update.status == "completed":
        task.progress_percentage = 100

    db.commit()
    db.refresh(task)
    return _enrich_task(task)


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


@router.post(
    "/{project_id}/tasks/{task_id}/comments",
    response_model=TaskCommentResponse,
)
def add_task_comment(
    project_id: int,
    task_id: int,
    comment_data: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(project_id, current_user, db)

    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = TaskComment(
        task_id=task_id,
        user_id=current_user.id,
        content=comment_data.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "task_id": comment.task_id,
        "user_id": comment.user_id,
        "user_name": current_user.name,
        "content": comment.content,
        "created_at": comment.created_at,
    }


@router.get(
    "/{project_id}/tasks/{task_id}/comments",
    response_model=List[TaskCommentResponse],
)
def list_task_comments(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(project_id, current_user, db)
    comments = db.query(TaskComment).filter(TaskComment.task_id == task_id).order_by(TaskComment.id.asc()).all()
    results = []
    for c in comments:
        results.append({
            "id": c.id,
            "task_id": c.task_id,
            "user_id": c.user_id,
            "user_name": c.user.name if c.user else "Unknown",
            "content": c.content,
            "created_at": c.created_at,
        })
    return results


@router.get(
    "/user/my-tasks",
    response_model=List[TaskResponse],
)
def get_my_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task).filter(Task.assigned_to_id == current_user.id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority:
        query = query.filter(Task.priority == priority)
    tasks = query.order_by(Task.due_date.asc().nullslast(), Task.id.desc()).all()
    return [_enrich_task(t) for t in tasks]
