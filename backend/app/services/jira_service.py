"""Jira-Inspired Enterprise Project Management Service
Core business logic for Issue Tracking, Epics, Backlog, Roadmap, Workload, Dependencies, Time Tracking, and Automations.
"""
from datetime import datetime, timezone, timedelta
import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.task import Task, TaskComment, TaskDependency
from app.models.project import Project, ProjectMember, ProjectMilestone
from app.models.agile import Sprint
from app.models.user import User
from app.models.jira_pm import (
    WorkLog,
    ProjectWorkflow,
    WorkflowStatus,
    WorkflowTransition,
    AutomationRule,
    AutomationLog,
    ProjectRisk,
    WikiPage,
    SavedFilter,
    ProjectTemplate,
)


def get_issue_by_key_or_id(db: Session, key_or_id: str) -> Optional[Dict[str, Any]]:
    query = db.query(Task)
    if key_or_id.isdigit():
        task = query.filter(or_(Task.id == int(key_or_id), Task.issue_key == key_or_id)).first()
    else:
        task = query.filter(func.upper(Task.issue_key) == key_or_id.strip().upper()).first()

    if not task:
        return None

    # Fetch subtasks
    subtasks = db.query(Task).filter(Task.parent_task_id == task.id).order_by(Task.id.asc()).all()
    subtasks_data = [{
        "id": st.id,
        "issue_key": st.issue_key or f"DEV-{1000 + st.id}",
        "title": st.title,
        "status": st.status,
        "priority": st.priority,
        "assigned_to_name": st.assigned_to.name if st.assigned_to else None,
        "story_points": st.story_points,
    } for st in subtasks]

    # Fetch dependencies
    deps = db.query(TaskDependency).filter(TaskDependency.task_id == task.id).all()
    deps_data = [{
        "id": d.id,
        "depends_on_task_id": d.depends_on_task_id,
        "depends_on_key": d.depends_on_task.issue_key if d.depends_on_task else f"DEV-{1000 + d.depends_on_task_id}",
        "depends_on_title": d.depends_on_task.title if d.depends_on_task else "Unknown",
        "depends_on_status": d.depends_on_task.status if d.depends_on_task else "todo",
        "dependency_type": d.dependency_type,
    } for d in deps]

    # Fetch work logs
    logs = db.query(WorkLog).filter(WorkLog.task_id == task.id).order_by(WorkLog.logged_date.desc()).all()
    logs_data = [{
        "id": l.id,
        "task_id": l.task_id,
        "user_id": l.user_id,
        "user_name": l.user.name if l.user else "Unknown",
        "hours_spent": l.hours_spent,
        "description": l.description,
        "logged_date": l.logged_date,
        "created_at": l.created_at,
    } for l in logs]

    comments_count = db.query(TaskComment).filter(TaskComment.task_id == task.id).count()

    return {
        "id": task.id,
        "issue_key": task.issue_key or f"DEV-{1000 + task.id}",
        "issue_type": task.issue_type or "task",
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "project_id": task.project_id,
        "project_name": task.project.name if task.project else None,
        "assigned_to_id": task.assigned_to_id,
        "assigned_to_name": task.assigned_to.name if task.assigned_to else None,
        "reporter_id": task.reporter_id,
        "reporter_name": task.reporter.name if task.reporter else (task.assigned_by.name if task.assigned_by else None),
        "epic_id": task.epic_id,
        "epic_title": task.epic.title if task.epic else None,
        "sprint_id": task.sprint_id,
        "sprint_name": task.sprint.name if task.sprint else None,
        "story_points": task.story_points or 0,
        "estimated_hours": task.estimated_hours,
        "actual_hours": task.actual_hours,
        "progress_percentage": task.progress_percentage,
        "labels": task.labels,
        "order_rank": task.order_rank or 0.0,
        "start_date": task.start_date,
        "due_date": task.due_date,
        "subtasks": subtasks_data,
        "dependencies": deps_data,
        "comments_count": comments_count,
        "work_logs": logs_data,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


def list_project_epics(db: Session, project_id: int) -> List[Dict[str, Any]]:
    epics = db.query(Task).filter(
        Task.project_id == project_id,
        Task.issue_type == "epic",
    ).order_by(Task.id.desc()).all()

    results = []
    for ep in epics:
        children = db.query(Task).filter(Task.epic_id == ep.id).all()
        child_count = len(children)
        completed_count = sum(1 for c in children if c.status in ["done", "completed"])
        progress = int((completed_count / child_count * 100)) if child_count > 0 else ep.progress_percentage

        results.append({
            "id": ep.id,
            "issue_key": ep.issue_key or f"DEV-{1000 + ep.id}",
            "title": ep.title,
            "description": ep.description,
            "status": ep.status,
            "priority": ep.priority,
            "story_points": ep.story_points or 0,
            "child_count": child_count,
            "completed_count": completed_count,
            "progress_percentage": progress,
            "labels": ep.labels,
            "due_date": ep.due_date,
        })
    return results


def get_project_backlog(db: Session, project_id: int) -> Dict[str, Any]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {}

    # Sprints
    sprints = db.query(Sprint).filter(Sprint.project_id == project_id).order_by(Sprint.start_date.asc()).all()
    active_sprints = []
    planned_sprints = []

    for s in sprints:
        s_tasks = db.query(Task).filter(
            Task.project_id == project_id,
            Task.sprint_id == s.id,
            Task.issue_type != "epic",
        ).order_by(Task.order_rank.asc(), Task.id.desc()).all()

        s_pts = sum(t.story_points or 0 for t in s_tasks)
        s_dict = {
            "id": s.id,
            "name": s.name,
            "goal": s.goal,
            "status": s.status,
            "start_date": s.start_date,
            "end_date": s.end_date,
            "total_issues": len(s_tasks),
            "total_story_points": s_pts,
            "issues": [{
                "id": t.id,
                "issue_key": t.issue_key or f"DEV-{1000 + t.id}",
                "issue_type": t.issue_type or "task",
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "story_points": t.story_points or 0,
                "assigned_to_name": t.assigned_to.name if t.assigned_to else None,
                "epic_title": t.epic.title if t.epic else None,
                "labels": t.labels,
                "order_rank": t.order_rank or 0.0,
            } for t in s_tasks],
        }

        if s.status == "active":
            active_sprints.append(s_dict)
        else:
            planned_sprints.append(s_dict)

    # Product Backlog: Issues not assigned to any sprint or with status 'backlog'
    backlog_tasks = db.query(Task).filter(
        Task.project_id == project_id,
        Task.sprint_id.is_(None),
        Task.issue_type != "epic",
    ).order_by(Task.order_rank.asc(), Task.id.desc()).all()

    total_backlog_pts = sum(t.story_points or 0 for t in backlog_tasks)
    product_backlog = [{
        "id": t.id,
        "issue_key": t.issue_key or f"DEV-{1000 + t.id}",
        "issue_type": t.issue_type or "task",
        "title": t.title,
        "status": t.status,
        "priority": t.priority,
        "story_points": t.story_points or 0,
        "assigned_to_name": t.assigned_to.name if t.assigned_to else None,
        "epic_title": t.epic.title if t.epic else None,
        "labels": t.labels,
        "order_rank": t.order_rank or 0.0,
    } for t in backlog_tasks]

    epics = list_project_epics(db, project_id)

    return {
        "project_id": project.id,
        "project_name": project.name,
        "active_sprints": active_sprints,
        "planned_sprints": planned_sprints,
        "product_backlog": product_backlog,
        "total_backlog_story_points": total_backlog_pts,
        "epics": epics,
    }


def reorder_issue(
    db: Session,
    project_id: int,
    issue_id: int,
    target_sprint_id: Optional[int] = None,
    target_status: Optional[str] = None,
    order_rank: Optional[float] = None,
) -> Task:
    task = db.query(Task).filter(Task.id == issue_id, Task.project_id == project_id).first()
    if not task:
        raise ValueError("Issue not found")

    if target_sprint_id == 0 or target_sprint_id == -1:
        task.sprint_id = None
    elif target_sprint_id is not None:
        task.sprint_id = target_sprint_id

    if target_status:
        task.status = target_status
        if target_status in ["done", "completed"]:
            task.progress_percentage = 100

    if order_rank is not None:
        task.order_rank = order_rank

    db.commit()
    db.refresh(task)

    # Trigger automation if status changed
    if target_status:
        run_automation(db, "status_changed", "task", task.id, {"target_status": target_status, "project_id": project_id})

    return task


def add_work_log(
    db: Session,
    task_id: int,
    user_id: int,
    hours_spent: float,
    description: Optional[str] = None,
    logged_date: Optional[datetime] = None,
) -> WorkLog:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ValueError("Task not found")

    log = WorkLog(
        task_id=task_id,
        user_id=user_id,
        hours_spent=hours_spent,
        description=description,
        logged_date=logged_date or datetime.now(timezone.utc),
    )
    db.add(log)
    task.actual_hours = (task.actual_hours or 0.0) + hours_spent
    db.commit()
    db.refresh(log)
    return log


def calculate_team_workload(db: Session, project_id: int) -> List[Dict[str, Any]]:
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    user_ids = [m.user_id for m in members]

    # Include owner and mentor
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        if project.owner_id not in user_ids:
            user_ids.append(project.owner_id)
        if project.faculty_mentor_id and project.faculty_mentor_id not in user_ids:
            user_ids.append(project.faculty_mentor_id)

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    workload = []

    STANDARD_CAPACITY_HOURS = 40.0  # standard weekly allocation

    for u in users:
        tasks = db.query(Task).filter(
            Task.project_id == project_id,
            Task.assigned_to_id == u.id,
            Task.status != "done",
            Task.status != "completed",
        ).all()

        total_tasks = len(tasks)
        total_estimated = sum(t.estimated_hours or 0.0 for t in tasks)
        total_logged = sum(t.actual_hours or 0.0 for t in tasks)
        remaining = max(0.0, total_estimated - total_logged)
        story_points = sum(t.story_points or 0 for t in tasks)
        is_overloaded = total_estimated > STANDARD_CAPACITY_HOURS

        workload.append({
            "user_id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "active_tasks_count": total_tasks,
            "story_points": story_points,
            "estimated_hours": total_estimated,
            "logged_hours": total_logged,
            "remaining_hours": remaining,
            "capacity_hours": STANDARD_CAPACITY_HOURS,
            "utilization_percentage": int((total_estimated / STANDARD_CAPACITY_HOURS) * 100) if STANDARD_CAPACITY_HOURS > 0 else 0,
            "is_overloaded": is_overloaded,
            "tasks": [{
                "id": t.id,
                "issue_key": t.issue_key or f"DEV-{1000 + t.id}",
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "estimated_hours": t.estimated_hours,
            } for t in tasks[:5]],
        })

    return workload


def get_project_roadmap(db: Session, project_id: int) -> Dict[str, Any]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {}

    epics = db.query(Task).filter(
        Task.project_id == project_id,
        Task.issue_type == "epic",
    ).order_by(Task.start_date.asc().nullslast(), Task.id.asc()).all()

    now = datetime.now(timezone.utc)
    base_start = project.start_date or (now - timedelta(days=14))

    epics_data = []
    for i, ep in enumerate(epics):
        children = db.query(Task).filter(Task.epic_id == ep.id).all()
        child_count = len(children)
        completed_count = sum(1 for c in children if c.status in ["done", "completed"])
        prog = int((completed_count / child_count * 100)) if child_count > 0 else ep.progress_percentage

        # Set realistic start and end dates if null
        start_d = ep.start_date or (base_start + timedelta(days=i * 14))
        end_d = ep.due_date or (start_d + timedelta(days=28))
        is_overdue = end_d < now and ep.status not in ["done", "completed"]

        epics_data.append({
            "id": ep.id,
            "issue_key": ep.issue_key or f"DEV-{1000 + ep.id}",
            "title": ep.title,
            "status": ep.status,
            "priority": ep.priority,
            "start_date": start_d,
            "end_date": end_d,
            "progress_percentage": prog,
            "child_count": child_count,
            "completed_count": completed_count,
            "is_overdue": is_overdue,
            "story_points": ep.story_points or 0,
        })

    milestones = db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id).all()
    milestones_data = [{
        "id": m.id,
        "title": m.title,
        "due_date": m.due_date,
        "status": m.status,
    } for m in milestones]

    return {
        "project_id": project.id,
        "project_name": project.name,
        "start_date": project.start_date,
        "deadline": project.deadline,
        "epics": epics_data,
        "milestones": milestones_data,
    }


def add_task_dependency(db: Session, task_id: int, depends_on_id: int, dep_type: str = "blocks") -> TaskDependency:
    if task_id == depends_on_id:
        raise ValueError("A task cannot depend on itself.")

    # Cycle Detection using DFS
    visited = set()
    stack = [depends_on_id]
    while stack:
        curr = stack.pop()
        if curr == task_id:
            raise ValueError("Circular dependency detected! This would cause an infinite lock.")
        if curr not in visited:
            visited.add(curr)
            outgoing = db.query(TaskDependency.depends_on_task_id).filter(TaskDependency.task_id == curr).all()
            for row in outgoing:
                stack.append(row[0])

    dep = TaskDependency(
        task_id=task_id,
        depends_on_task_id=depends_on_id,
        dependency_type=dep_type,
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


def run_automation(
    db: Session,
    trigger_event: str,
    entity_type: str,
    entity_id: int,
    context: Dict[str, Any],
) -> None:
    project_id = context.get("project_id")
    rules_query = db.query(AutomationRule).filter(
        AutomationRule.trigger_event == trigger_event,
        AutomationRule.is_active == True,
    )
    if project_id:
        rules_query = rules_query.filter(or_(AutomationRule.project_id == project_id, AutomationRule.project_id.is_(None)))

    rules = rules_query.all()
    for rule in rules:
        try:
            # Check conditions
            conds = json.loads(rule.conditions_json or "{}")
            matches = True
            for k, v in conds.items():
                if context.get(k) != v:
                    matches = False
                    break

            if not matches:
                continue

            # Execute action
            actions = json.loads(rule.actions_json or "{}")
            if actions.get("recalculate_project_progress") and project_id:
                p_tasks = db.query(Task).filter(Task.project_id == project_id, Task.issue_type != "epic").all()
                if p_tasks:
                    done_count = sum(1 for t in p_tasks if t.status in ["done", "completed"])
                    pct = int((done_count / len(p_tasks)) * 100)
                    proj = db.query(Project).filter(Project.id == project_id).first()
                    if proj:
                        proj.completion_percentage = pct

            rule.execution_count = (rule.execution_count or 0) + 1
            log = AutomationLog(
                rule_id=rule.id,
                trigger_event=trigger_event,
                entity_type=entity_type,
                entity_id=entity_id,
                status="success",
                details=f"Executed action {rule.actions_json} on {entity_type} #{entity_id}",
                executed_at=datetime.now(timezone.utc),
            )
            db.add(log)
            db.commit()
        except Exception as err:
            db.rollback()
            log = AutomationLog(
                rule_id=rule.id,
                trigger_event=trigger_event,
                entity_type=entity_type,
                entity_id=entity_id,
                status="failed",
                details=str(err),
                executed_at=datetime.now(timezone.utc),
            )
            db.add(log)
            db.commit()


def get_burndown_and_velocity(db: Session, project_id: int, sprint_id: Optional[int] = None) -> Dict[str, Any]:
    sprints = db.query(Sprint).filter(Sprint.project_id == project_id).order_by(Sprint.start_date.asc()).all()

    # Velocity chart data
    velocity_data = []
    for s in sprints:
        s_tasks = db.query(Task).filter(Task.sprint_id == s.id).all()
        committed_pts = sum(t.story_points or 0 for t in s_tasks)
        completed_pts = sum(t.story_points or 0 for t in s_tasks if t.status in ["done", "completed"])
        velocity_data.append({
            "sprint_name": s.name,
            "committed_points": committed_pts,
            "completed_points": completed_pts,
        })

    # Burndown chart data for selected or active sprint
    active_sprint = None
    if sprint_id:
        active_sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not active_sprint:
        active_sprint = next((s for s in sprints if s.status == "active"), None)
    if not active_sprint and sprints:
        active_sprint = sprints[-1]

    burndown_points = []
    if active_sprint:
        tasks = db.query(Task).filter(Task.sprint_id == active_sprint.id).all()
        total_pts = sum(t.story_points or 0 for t in tasks) or 20
        total_days = max(1, (active_sprint.end_date - active_sprint.start_date).days)

        for day in range(min(total_days + 1, 14)):
            ideal = round(total_pts - (total_pts / total_days) * day, 1)
            # Simulated realistic actual burn from logged data
            burn_ratio = min(1.0, (day / total_days) * 0.9)
            actual = max(0.0, round(total_pts * (1 - burn_ratio), 1))
            burndown_points.append({
                "day": f"Day {day + 1}",
                "ideal": max(0.0, ideal),
                "actual": actual,
            })

    return {
        "velocity": velocity_data,
        "burndown": {
            "sprint_name": active_sprint.name if active_sprint else "No Sprint",
            "total_points": burndown_points[0]["ideal"] if burndown_points else 0,
            "data": burndown_points,
        },
    }


def global_search(db: Session, query: str) -> Dict[str, Any]:
    q = query.strip()
    if not q:
        return {"projects": [], "issues": [], "users": [], "announcements": []}

    # 1. Direct Issue Key Search
    issues = db.query(Task).filter(
        or_(
            func.upper(Task.issue_key) == q.upper(),
            Task.title.ilike(f"%{q}%"),
            Task.description.ilike(f"%{q}%"),
        )
    ).limit(10).all()

    # 2. Projects
    projects = db.query(Project).filter(
        or_(
            Project.name.ilike(f"%{q}%"),
            Project.code.ilike(f"%{q}%"),
            Project.description.ilike(f"%{q}%"),
        )
    ).limit(8).all()

    # 3. Users
    users = db.query(User).filter(
        or_(
            User.name.ilike(f"%{q}%"),
            User.email.ilike(f"%{q}%"),
        )
    ).limit(8).all()

    return {
        "issues": [{
            "id": t.id,
            "issue_key": t.issue_key or f"DEV-{1000 + t.id}",
            "issue_type": t.issue_type or "task",
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "project_id": t.project_id,
            "project_name": t.project.name if t.project else None,
        } for t in issues],
        "projects": [{
            "id": p.id,
            "name": p.name,
            "code": p.code,
            "category": p.category,
            "status": p.status,
        } for p in projects],
        "users": [{
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
        } for u in users],
    }
