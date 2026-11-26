import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.devops_qa import TestCase, TestExecution, TestPlan, TestRun
from app.models.user import User
from app.routes.jira_pm import _check_project_access
from app.schemas.devops_qa import (
    TestCaseCreate,
    TestCaseResponse,
    TestCaseUpdate,
    TestExecutionResponse,
    TestExecutionUpdate,
    TestPlanCreate,
    TestPlanResponse,
    TestRunCreate,
    TestRunResponse,
)
from app.services.qa_service import (
    create_bug_from_execution,
    create_test_case,
    create_test_plan,
    create_test_run,
    get_test_coverage_report,
    update_test_case,
    update_test_execution,
)

router = APIRouter(
    prefix="/qa",
    tags=["Software Testing & QA"],
)


def _serialize_test_case(tc: TestCase, db: Session) -> dict:
    try:
        steps = json.loads(tc.steps_json or "[]")
    except Exception:
        steps = []
    latest_exec = (
        db.query(TestExecution)
        .filter(TestExecution.test_case_id == tc.id)
        .order_by(TestExecution.id.desc())
        .first()
    )
    return {
        "id": tc.id,
        "project_id": tc.project_id,
        "test_plan_id": tc.test_plan_id,
        "test_plan_name": tc.test_plan.name if tc.test_plan else None,
        "linked_task_id": tc.linked_task_id,
        "linked_issue_key": tc.linked_task.issue_key if tc.linked_task else None,
        "linked_issue_title": tc.linked_task.title if tc.linked_task else None,
        "case_key": tc.case_key or f"TC-{100 + tc.id}",
        "title": tc.title,
        "description": tc.description,
        "preconditions": tc.preconditions,
        "steps": steps,
        "expected_result": tc.expected_result,
        "priority": tc.priority,
        "test_type": tc.test_type,
        "status": tc.status,
        "latest_execution_status": latest_exec.status if latest_exec else "not_run",
        "created_by_name": tc.created_by.name if tc.created_by else None,
        "created_at": tc.created_at,
    }


def _serialize_test_run(run: TestRun, db: Session) -> dict:
    execs = db.query(TestExecution).filter(TestExecution.test_run_id == run.id).all()
    total = len(execs)
    passed = sum(1 for e in execs if e.status == "pass")
    failed = sum(1 for e in execs if e.status == "fail")
    blocked = sum(1 for e in execs if e.status == "blocked")
    not_run = sum(1 for e in execs if e.status == "not_run")
    executed = passed + failed + blocked
    pass_rate = round((passed / executed) * 100, 1) if executed > 0 else 0.0
    return {
        "id": run.id,
        "project_id": run.project_id,
        "test_plan_id": run.test_plan_id,
        "test_plan_name": run.test_plan.name if run.test_plan else None,
        "sprint_id": run.sprint_id,
        "name": run.name,
        "description": run.description,
        "environment_name": run.environment_name,
        "build_version": run.build_version,
        "status": run.status,
        "total_cases": total,
        "passed_count": passed,
        "failed_count": failed,
        "blocked_count": blocked,
        "not_run_count": not_run,
        "pass_rate": pass_rate,
        "executed_by_name": run.executed_by.name if run.executed_by else None,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
    }


def _serialize_execution(e: TestExecution) -> dict:
    tc = e.test_case
    try:
        steps = json.loads(tc.steps_json or "[]") if tc else []
    except Exception:
        steps = []
    return {
        "id": e.id,
        "test_run_id": e.test_run_id,
        "test_case_id": e.test_case_id,
        "case_key": (tc.case_key or f"TC-{100 + tc.id}") if tc else "",
        "case_title": tc.title if tc else "Unknown",
        "case_priority": tc.priority if tc else "medium",
        "expected_result": tc.expected_result if tc else "",
        "steps": steps,
        "linked_issue_key": tc.linked_task.issue_key if tc and tc.linked_task else None,
        "status": e.status,
        "actual_result": e.actual_result,
        "notes": e.notes,
        "defect_task_id": e.defect_task_id,
        "defect_issue_key": e.defect_task.issue_key if e.defect_task else None,
        "executed_by_name": e.executed_by.name if e.executed_by else None,
        "executed_at": e.executed_at,
    }


# 1. TEST PLANS
@router.get("/projects/{project_id}/test-plans", response_model=List[TestPlanResponse])
def list_test_plans(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    plans = db.query(TestPlan).filter(TestPlan.project_id == project_id).order_by(TestPlan.id.desc()).all()
    return [
        {
            "id": p.id,
            "project_id": p.project_id,
            "sprint_id": p.sprint_id,
            "sprint_name": p.sprint.name if p.sprint else None,
            "name": p.name,
            "description": p.description,
            "objective": p.objective,
            "status": p.status,
            "test_case_count": len(p.test_cases),
            "created_by_name": p.created_by.name if p.created_by else None,
            "created_at": p.created_at,
        }
        for p in plans
    ]


@router.post("/projects/{project_id}/test-plans", response_model=TestPlanResponse, status_code=status.HTTP_201_CREATED)
def add_test_plan(
    project_id: int,
    plan_in: TestPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    p = create_test_plan(db, project_id, plan_in, user_id=current_user.id)
    return {
        "id": p.id,
        "project_id": p.project_id,
        "sprint_id": p.sprint_id,
        "sprint_name": p.sprint.name if p.sprint else None,
        "name": p.name,
        "description": p.description,
        "objective": p.objective,
        "status": p.status,
        "test_case_count": 0,
        "created_by_name": current_user.name,
        "created_at": p.created_at,
    }


@router.delete("/projects/{project_id}/test-plans/{plan_id}")
def delete_test_plan(
    project_id: int,
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    plan = db.query(TestPlan).filter(TestPlan.id == plan_id, TestPlan.project_id == project_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Test plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Test plan deleted"}


# 2. TEST CASES
@router.get("/projects/{project_id}/test-cases", response_model=List[TestCaseResponse])
def list_test_cases(
    project_id: int,
    test_plan_id: Optional[int] = None,
    test_type: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    query = db.query(TestCase).filter(TestCase.project_id == project_id)
    if test_plan_id:
        query = query.filter(TestCase.test_plan_id == test_plan_id)
    if test_type:
        query = query.filter(TestCase.test_type == test_type)
    if priority:
        query = query.filter(TestCase.priority == priority)
    cases = query.order_by(TestCase.id.desc()).all()
    return [_serialize_test_case(c, db) for c in cases]


@router.post("/projects/{project_id}/test-cases", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
def add_test_case(
    project_id: int,
    tc_in: TestCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    tc = create_test_case(db, project_id, tc_in, user_id=current_user.id)
    return _serialize_test_case(tc, db)


@router.put("/projects/{project_id}/test-cases/{case_id}", response_model=TestCaseResponse)
def edit_test_case(
    project_id: int,
    case_id: int,
    tc_in: TestCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    tc = db.query(TestCase).filter(TestCase.id == case_id, TestCase.project_id == project_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    updated = update_test_case(db, tc, tc_in)
    return _serialize_test_case(updated, db)


@router.delete("/projects/{project_id}/test-cases/{case_id}")
def delete_test_case(
    project_id: int,
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    tc = db.query(TestCase).filter(TestCase.id == case_id, TestCase.project_id == project_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    db.delete(tc)
    db.commit()
    return {"message": "Test case deleted"}


# 3. TEST RUNS & EXECUTIONS
@router.get("/projects/{project_id}/test-runs", response_model=List[TestRunResponse])
def list_test_runs(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    runs = db.query(TestRun).filter(TestRun.project_id == project_id).order_by(TestRun.started_at.desc()).all()
    return [_serialize_test_run(r, db) for r in runs]


@router.post("/projects/{project_id}/test-runs", response_model=TestRunResponse, status_code=status.HTTP_201_CREATED)
def start_test_run(
    project_id: int,
    run_in: TestRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    run = create_test_run(db, project_id, run_in, user_id=current_user.id)
    return _serialize_test_run(run, db)


@router.get("/projects/{project_id}/test-runs/{run_id}/executions", response_model=List[TestExecutionResponse])
def list_run_executions(
    project_id: int,
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    run = db.query(TestRun).filter(TestRun.id == run_id, TestRun.project_id == project_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")
    execs = db.query(TestExecution).filter(TestExecution.test_run_id == run_id).order_by(TestExecution.id.asc()).all()
    return [_serialize_execution(e) for e in execs]


@router.put("/test-runs/{run_id}/executions/{execution_id}", response_model=TestExecutionResponse)
def execute_test_case(
    run_id: int,
    execution_id: int,
    upd: TestExecutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution = db.query(TestExecution).filter(TestExecution.id == execution_id, TestExecution.test_run_id == run_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Test execution record not found")
    _check_project_access(execution.test_run.project_id, current_user, db)
    updated = update_test_execution(db, execution, upd, user_id=current_user.id)
    return _serialize_execution(updated)


@router.post("/executions/{execution_id}/create-bug", status_code=status.HTTP_201_CREATED)
def log_bug_from_failed_execution(
    execution_id: int,
    assigned_to_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Test execution record not found")
    _check_project_access(execution.test_run.project_id, current_user, db)
    if execution.status != "fail":
        raise HTTPException(status_code=400, detail="Bugs can only be created from failed test executions.")
    bug = create_bug_from_execution(db, execution, user_id=current_user.id, assigned_to_id=assigned_to_id)
    return {
        "message": f"Created bug {bug.issue_key}",
        "bug_id": bug.id,
        "issue_key": bug.issue_key,
        "title": bug.title,
        "priority": bug.priority,
        "status": bug.status,
    }


# 4. COVERAGE REPORT
@router.get("/projects/{project_id}/coverage")
def get_coverage_report(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    return get_test_coverage_report(db, project_id)
