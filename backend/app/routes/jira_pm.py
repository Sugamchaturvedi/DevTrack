from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.task import Task, TaskDependency
from app.models.project import Project, ProjectMember
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
from app.schemas.jira_pm import (
    IssueDetailResponse,
    EpicSummaryResponse,
    BacklogResponse,
    ReorderIssueRequest,
    WorkLogCreate,
    WorkLogResponse,
    RiskCreate,
    RiskResponse,
    WikiPageCreate,
    WikiPageResponse,
    AutomationRuleCreate,
    AutomationRuleResponse,
    ProjectTemplateResponse,
)
from app.services.jira_service import (
    get_issue_by_key_or_id,
    list_project_epics,
    get_project_backlog,
    reorder_issue,
    add_work_log,
    calculate_team_workload,
    get_project_roadmap,
    add_task_dependency,
    get_burndown_and_velocity,
    global_search,
)
from app.services.task_service import create_task, update_task_status
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(
    prefix="/pm",
    tags=["Jira & Enterprise PM"],
)


def _check_project_access(project_id: int, current_user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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
        raise HTTPException(status_code=403, detail="Unauthorized access to this project")

    return project


# 1. ISSUE TRACKING
@router.get("/issues/{key_or_id}")
def get_issue(
    key_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = get_issue_by_key_or_id(db, key_or_id)
    if not issue:
        raise HTTPException(status_code=404, detail=f"Issue '{key_or_id}' not found")
    return issue


@router.get("/projects/{project_id}/issues")
def list_project_issues(
    project_id: int,
    issue_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    reporter_id: Optional[int] = None,
    epic_id: Optional[int] = None,
    sprint_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    query = db.query(Task).filter(Task.project_id == project_id)

    if issue_type:
        query = query.filter(Task.issue_type == issue_type)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assignee_id:
        query = query.filter(Task.assigned_to_id == assignee_id)
    if reporter_id:
        query = query.filter(Task.reporter_id == reporter_id)
    if epic_id:
        query = query.filter(Task.epic_id == epic_id)
    if sprint_id:
        query = query.filter(Task.sprint_id == sprint_id)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%") | Task.issue_key.ilike(f"%{search}%"))

    tasks = query.order_by(Task.order_rank.asc(), Task.id.desc()).all()
    from app.routes.tasks import _enrich_task
    return [_enrich_task(t) for t in tasks]


@router.post("/projects/{project_id}/issues", status_code=status.HTTP_201_CREATED)
def create_project_issue(
    project_id: int,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    task = create_task(db, task_in, project_id, assigned_by_id=current_user.id)
    from app.routes.tasks import _enrich_task
    return _enrich_task(task)


@router.put("/projects/{project_id}/issues/{issue_id}")
def update_project_issue(
    project_id: int,
    issue_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    task = db.query(Task).filter(Task.id == issue_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Issue not found")

    update_dict = task_update.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(task, k, v)

    if task_update.status in ["done", "completed"]:
        task.progress_percentage = 100

    db.commit()
    db.refresh(task)
    from app.routes.tasks import _enrich_task
    return _enrich_task(task)


# 2. EPICS & PROGRESS
@router.get("/projects/{project_id}/epics")
def get_epics(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    return list_project_epics(db, project_id)


# 3. BACKLOG MANAGEMENT
@router.get("/projects/{project_id}/backlog")
def get_backlog(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    return get_project_backlog(db, project_id)


@router.put("/projects/{project_id}/issues/{issue_id}/reorder")
def reorder_backlog_issue(
    project_id: int,
    issue_id: int,
    reorder_req: ReorderIssueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    try:
        task = reorder_issue(
            db,
            project_id,
            issue_id,
            target_sprint_id=reorder_req.target_sprint_id,
            target_status=reorder_req.target_status,
            order_rank=reorder_req.order_rank,
        )
        from app.routes.tasks import _enrich_task
        return _enrich_task(task)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# 4. TIME TRACKING & WORK LOGS
@router.post("/projects/{project_id}/tasks/{task_id}/worklogs")
def log_work_time(
    project_id: int,
    task_id: int,
    log_in: WorkLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    log = add_work_log(
        db,
        task_id,
        current_user.id,
        hours_spent=log_in.hours_spent,
        description=log_in.description,
        logged_date=log_in.logged_date,
    )
    return {
        "id": log.id,
        "task_id": log.task_id,
        "user_id": log.user_id,
        "user_name": current_user.name,
        "hours_spent": log.hours_spent,
        "description": log.description,
        "logged_date": log.logged_date,
        "created_at": log.created_at,
    }


# 5. ROADMAP & TIMELINE
@router.get("/projects/{project_id}/roadmap")
def get_roadmap(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    return get_project_roadmap(db, project_id)


# 6. WORKLOAD & CAPACITY
@router.get("/projects/{project_id}/workload")
def get_workload(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    return calculate_team_workload(db, project_id)


# 7. DEPENDENCIES & CYCLE DETECTION
@router.post("/projects/{project_id}/dependencies")
def create_dependency(
    project_id: int,
    task_id: int,
    depends_on_id: int,
    dep_type: str = "blocks",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    try:
        dep = add_task_dependency(db, task_id, depends_on_id, dep_type)
        return {"id": dep.id, "task_id": dep.task_id, "depends_on_task_id": dep.depends_on_task_id, "dependency_type": dep.dependency_type}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/projects/{project_id}/dependencies/{dep_id}")
def delete_dependency(
    project_id: int,
    dep_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    dep = db.query(TaskDependency).filter(TaskDependency.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    db.delete(dep)
    db.commit()
    return {"message": "Dependency removed"}


# 8. RISK MANAGEMENT
@router.get("/projects/{project_id}/risks", response_model=List[RiskResponse])
def list_risks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    risks = db.query(ProjectRisk).filter(ProjectRisk.project_id == project_id).order_by(ProjectRisk.id.desc()).all()
    return [{
        "id": r.id,
        "project_id": r.project_id,
        "title": r.title,
        "description": r.description,
        "category": r.category,
        "probability": r.probability,
        "impact": r.impact,
        "severity": r.severity,
        "owner_id": r.owner_id,
        "owner_name": r.owner.name if r.owner else None,
        "mitigation_plan": r.mitigation_plan,
        "status": r.status,
        "review_date": r.review_date,
        "created_at": r.created_at,
    } for r in risks]


@router.post("/projects/{project_id}/risks", response_model=RiskResponse, status_code=status.HTTP_201_CREATED)
def create_risk(
    project_id: int,
    risk_in: RiskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    risk = ProjectRisk(
        project_id=project_id,
        title=risk_in.title,
        description=risk_in.description,
        category=risk_in.category,
        probability=risk_in.probability,
        impact=risk_in.impact,
        severity=risk_in.severity,
        owner_id=current_user.id,
        mitigation_plan=risk_in.mitigation_plan,
        status=risk_in.status,
        review_date=risk_in.review_date,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return {
        "id": risk.id,
        "project_id": risk.project_id,
        "title": risk.title,
        "description": risk.description,
        "category": risk.category,
        "probability": risk.probability,
        "impact": risk.impact,
        "severity": risk.severity,
        "owner_id": risk.owner_id,
        "owner_name": current_user.name,
        "mitigation_plan": risk.mitigation_plan,
        "status": risk.status,
        "review_date": risk.review_date,
        "created_at": risk.created_at,
    }


# 9. WIKI & KNOWLEDGE BASE
@router.get("/projects/{project_id}/wiki", response_model=List[WikiPageResponse])
def list_wiki_pages(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    pages = db.query(WikiPage).filter(WikiPage.project_id == project_id).order_by(WikiPage.updated_at.desc()).all()
    return [{
        "id": p.id,
        "project_id": p.project_id,
        "title": p.title,
        "slug": p.slug,
        "category": p.category,
        "content": p.content,
        "version": p.version,
        "author_id": p.author_id,
        "author_name": p.author.name if p.author else None,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    } for p in pages]


@router.post("/projects/{project_id}/wiki", response_model=WikiPageResponse, status_code=status.HTTP_201_CREATED)
def create_wiki_page(
    project_id: int,
    page_in: WikiPageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    slug = page_in.title.lower().replace(" ", "-").replace("/", "-")
    page = WikiPage(
        project_id=project_id,
        title=page_in.title,
        slug=slug,
        category=page_in.category,
        content=page_in.content,
        author_id=current_user.id,
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return {
        "id": page.id,
        "project_id": page.project_id,
        "title": page.title,
        "slug": page.slug,
        "category": page.category,
        "content": page.content,
        "version": page.version,
        "author_id": page.author_id,
        "author_name": current_user.name,
        "created_at": page.created_at,
        "updated_at": page.updated_at,
    }


# 10. AUTOMATION RULES & LOGS
@router.get("/projects/{project_id}/automations")
def get_automations(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    rules = db.query(AutomationRule).filter(
        (AutomationRule.project_id == project_id) | (AutomationRule.project_id.is_(None))
    ).all()
    logs = db.query(AutomationLog).order_by(AutomationLog.executed_at.desc()).limit(20).all()
    return {
        "rules": [{
            "id": r.id,
            "project_id": r.project_id,
            "name": r.name,
            "trigger_event": r.trigger_event,
            "conditions_json": r.conditions_json,
            "actions_json": r.actions_json,
            "is_active": r.is_active,
            "execution_count": r.execution_count,
            "created_at": r.created_at,
        } for r in rules],
        "logs": [{
            "id": l.id,
            "rule_id": l.rule_id,
            "trigger_event": l.trigger_event,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "status": l.status,
            "details": l.details,
            "executed_at": l.executed_at,
        } for l in logs],
    }


@router.post("/projects/{project_id}/automations", response_model=AutomationRuleResponse, status_code=status.HTTP_201_CREATED)
def create_automation(
    project_id: int,
    rule_in: AutomationRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    rule = AutomationRule(
        project_id=project_id,
        name=rule_in.name,
        trigger_event=rule_in.trigger_event,
        conditions_json=rule_in.conditions_json,
        actions_json=rule_in.actions_json,
        is_active=rule_in.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


# 11. WORKFLOW BUILDER
@router.get("/workflows")
def get_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflows = db.query(ProjectWorkflow).all()
    result = []
    for w in workflows:
        result.append({
            "id": w.id,
            "name": w.name,
            "description": w.description,
            "project_type": w.project_type,
            "is_default": w.is_default,
            "statuses": [{
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "category": s.category,
                "color": s.color,
                "order_index": s.order_index,
                "wip_limit": s.wip_limit,
            } for s in w.statuses],
            "transitions": [{
                "id": t.id,
                "from_status_code": t.from_status_code,
                "to_status_code": t.to_status_code,
                "name": t.name,
            } for t in w.transitions],
        })
    return result


# 12. PROJECT TEMPLATES
@router.get("/templates", response_model=List[ProjectTemplateResponse])
def get_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ProjectTemplate).order_by(ProjectTemplate.id.asc()).all()


# 13. AGILE BURNDOWN & VELOCITY REPORTS
@router.get("/projects/{project_id}/reports/agile")
def get_agile_reports(
    project_id: int,
    sprint_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    return get_burndown_and_velocity(db, project_id, sprint_id)


# 14. GLOBAL SEARCH
@router.get("/search")
def search_platform(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return global_search(db, q)
