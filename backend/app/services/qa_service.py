"""Software Testing & QA Management Service
Handles Test Plans, Test Cases, Test Runs, Executions (Pass/Fail/Blocked/Not Run),
automatic Bug Issue Creation from failed executions, and Test Coverage Analytics.
"""
from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.devops_qa import TestCase, TestExecution, TestPlan, TestRun
from app.models.project import Project
from app.models.system import ActivityLog, Notification
from app.models.task import Task
from app.schemas.devops_qa import (
    TestCaseCreate,
    TestCaseUpdate,
    TestExecutionUpdate,
    TestPlanCreate,
    TestRunCreate,
)
from app.schemas.task import TaskCreate
from app.services.task_service import create_task


def create_test_plan(db: Session, project_id: int, plan_in: TestPlanCreate, user_id: int) -> TestPlan:
    plan = TestPlan(
        project_id=project_id,
        sprint_id=plan_in.sprint_id,
        name=plan_in.name.strip(),
        description=plan_in.description,
        objective=plan_in.objective,
        status=plan_in.status,
        created_by_id=user_id,
    )
    db.add(plan)
    db.flush()
    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="test_plan",
            entity_id=plan.id,
            action="created",
            details=f"Created test plan '{plan.name}'",
        )
    )
    db.commit()
    db.refresh(plan)
    return plan


def create_test_case(db: Session, project_id: int, tc_in: TestCaseCreate, user_id: int) -> TestCase:
    steps_serialized = json.dumps([s.model_dump() for s in tc_in.steps])
    tc = TestCase(
        project_id=project_id,
        test_plan_id=tc_in.test_plan_id,
        linked_task_id=tc_in.linked_task_id,
        title=tc_in.title.strip(),
        description=tc_in.description,
        preconditions=tc_in.preconditions,
        steps_json=steps_serialized,
        expected_result=tc_in.expected_result.strip(),
        priority=tc_in.priority,
        test_type=tc_in.test_type,
        status=tc_in.status,
        created_by_id=user_id,
    )
    db.add(tc)
    db.flush()
    tc.case_key = f"TC-{100 + tc.id}"
    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="test_case",
            entity_id=tc.id,
            action="created",
            details=f"Created test case {tc.case_key}: {tc.title}",
        )
    )
    db.commit()
    db.refresh(tc)
    return tc


def update_test_case(db: Session, tc: TestCase, tc_in: TestCaseUpdate) -> TestCase:
    data = tc_in.model_dump(exclude_unset=True)
    if "steps" in data and data["steps"] is not None:
        tc.steps_json = json.dumps(data.pop("steps"))
    for k, v in data.items():
        setattr(tc, k, v)
    db.commit()
    db.refresh(tc)
    return tc


def create_test_run(db: Session, project_id: int, run_in: TestRunCreate, user_id: int) -> TestRun:
    run = TestRun(
        project_id=project_id,
        test_plan_id=run_in.test_plan_id,
        sprint_id=run_in.sprint_id,
        name=run_in.name.strip(),
        description=run_in.description,
        environment_name=run_in.environment_name,
        build_version=run_in.build_version,
        status="in_progress",
        executed_by_id=user_id,
    )
    db.add(run)
    db.flush()

    # Select test cases to populate this run
    query = db.query(TestCase).filter(TestCase.project_id == project_id, TestCase.status != "deprecated")
    if run_in.test_case_ids:
        query = query.filter(TestCase.id.in_(run_in.test_case_ids))
    elif run_in.test_plan_id:
        query = query.filter(TestCase.test_plan_id == run_in.test_plan_id)

    cases = query.order_by(TestCase.id.asc()).all()
    for tc in cases:
        db.add(
            TestExecution(
                test_run_id=run.id,
                test_case_id=tc.id,
                status="not_run",
            )
        )

    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="test_run",
            entity_id=run.id,
            action="started",
            details=f"Started test run '{run.name}' with {len(cases)} test cases",
        )
    )
    db.commit()
    db.refresh(run)
    return run


def update_test_execution(
    db: Session,
    execution: TestExecution,
    upd: TestExecutionUpdate,
    user_id: int,
) -> TestExecution:
    execution.status = upd.status
    if upd.actual_result is not None:
        execution.actual_result = upd.actual_result
    if upd.notes is not None:
        execution.notes = upd.notes
    execution.executed_by_id = user_id
    execution.executed_at = datetime.now(timezone.utc) if upd.status != "not_run" else None

    # Update parent test run status automatically if all executions finished
    db.flush()
    run = db.query(TestRun).filter(TestRun.id == execution.test_run_id).first()
    if run:
        remaining = db.query(TestExecution).filter(TestExecution.test_run_id == run.id, TestExecution.status == "not_run").count()
        if remaining == 0:
            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
        else:
            run.status = "in_progress"
            run.completed_at = None

    db.commit()
    db.refresh(execution)
    return execution


def create_bug_from_execution(
    db: Session,
    execution: TestExecution,
    user_id: int,
    assigned_to_id: Optional[int] = None,
) -> Task:
    if execution.defect_task_id:
        existing_bug = db.query(Task).filter(Task.id == execution.defect_task_id).first()
        if existing_bug:
            return existing_bug

    tc = execution.test_case
    run = execution.test_run
    project_id = run.project_id if run else tc.project_id

    try:
        steps = json.loads(tc.steps_json or "[]")
    except Exception:
        steps = []

    steps_text = "\n".join(
        f"{s.get('step_no', idx + 1)}. {s.get('action', '')}" + (f" (Expected: {s.get('expected')})" if s.get("expected") else "")
        for idx, s in enumerate(steps)
    )

    priority_map = {"critical": "urgent", "high": "high", "medium": "medium", "low": "low"}
    bug_priority = priority_map.get((tc.priority or "medium").lower(), "high")

    desc_parts = [
        f"Defect logged automatically from failed Test Case {tc.case_key} in Test Run '{run.name}'.",
        f"Environment: {run.environment_name}" + (f" | Build: {run.build_version}" if run.build_version else ""),
        f"\n--- Preconditions ---\n{tc.preconditions}" if tc.preconditions else "",
        f"\n--- Steps to Reproduce ---\n{steps_text}" if steps_text else "",
        f"\n--- Expected Result ---\n{tc.expected_result}",
        f"\n--- Actual Result ---\n{execution.actual_result or 'Test case failed during execution.'}",
    ]
    if execution.notes:
        desc_parts.append(f"\n--- Tester Notes ---\n{execution.notes}")

    task_in = TaskCreate(
        title=f"[Bug] Failed {tc.case_key}: {tc.title}"[:195],
        description="\n".join([p for p in desc_parts if p]),
        status="open",
        priority=bug_priority,
        issue_type="bug",
        labels="qa-defect,test-failure",
        sprint_id=run.sprint_id if run else None,
        assigned_to_id=assigned_to_id,
    )
    bug_task = create_task(db, task_in, project_id, assigned_by_id=user_id)
    execution.defect_task_id = bug_task.id

    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="task",
            entity_id=bug_task.id,
            action="created",
            details=f"Logged defect {bug_task.issue_key} from failed test case {tc.case_key}",
        )
    )
    project = db.query(Project).filter(Project.id == project_id).first()
    if project and project.owner_id:
        db.add(
            Notification(
                user_id=project.owner_id,
                title=f"QA Defect Logged: {bug_task.issue_key}",
                message=f"Test case {tc.case_key} failed in '{run.name}' and generated bug {bug_task.issue_key}.",
                notification_type="warning",
                reference_link="#/issues",
            )
        )

    db.commit()
    db.refresh(execution)
    return bug_task


def get_test_coverage_report(db: Session, project_id: int) -> Dict[str, Any]:
    total_issues = db.query(Task).filter(Task.project_id == project_id, Task.issue_type != "bug").count()
    test_cases = db.query(TestCase).filter(TestCase.project_id == project_id).all()
    covered_task_ids = {tc.linked_task_id for tc in test_cases if tc.linked_task_id is not None}

    requirement_coverage_pct = round((len(covered_task_ids) / total_issues) * 100, 1) if total_issues > 0 else 0.0

    # Latest execution per test case
    status_counts = {"pass": 0, "fail": 0, "blocked": 0, "not_run": 0}
    open_defects = set()
    for tc in test_cases:
        latest_exec = (
            db.query(TestExecution)
            .filter(TestExecution.test_case_id == tc.id)
            .order_by(TestExecution.id.desc())
            .first()
        )
        st = latest_exec.status if latest_exec else "not_run"
        status_counts[st] = status_counts.get(st, 0) + 1
        if latest_exec and latest_exec.defect_task_id:
            open_defects.add(latest_exec.defect_task_id)

    executed_count = status_counts["pass"] + status_counts["fail"] + status_counts["blocked"]
    pass_rate_pct = round((status_counts["pass"] / executed_count) * 100, 1) if executed_count > 0 else 0.0
    execution_coverage_pct = round((executed_count / len(test_cases)) * 100, 1) if len(test_cases) > 0 else 0.0

    # Breakdown by Test Plan
    plans = db.query(TestPlan).filter(TestPlan.project_id == project_id).all()
    plan_breakdown = []
    for pl in plans:
        pl_cases = [tc for tc in test_cases if tc.test_plan_id == pl.id]
        pl_pass = 0
        pl_fail = 0
        pl_blocked = 0
        pl_not_run = 0
        for tc in pl_cases:
            le = db.query(TestExecution).filter(TestExecution.test_case_id == tc.id).order_by(TestExecution.id.desc()).first()
            st = le.status if le else "not_run"
            if st == "pass":
                pl_pass += 1
            elif st == "fail":
                pl_fail += 1
            elif st == "blocked":
                pl_blocked += 1
            else:
                pl_not_run += 1
        plan_breakdown.append({
            "plan_id": pl.id,
            "plan_name": pl.name,
            "status": pl.status,
            "total_cases": len(pl_cases),
            "passed": pl_pass,
            "failed": pl_fail,
            "blocked": pl_blocked,
            "not_run": pl_not_run,
            "pass_rate": round((pl_pass / (pl_pass + pl_fail + pl_blocked)) * 100, 1) if (pl_pass + pl_fail + pl_blocked) > 0 else 0.0,
        })

    total_runs = db.query(TestRun).filter(TestRun.project_id == project_id).count()

    return {
        "project_id": project_id,
        "total_issues": total_issues,
        "covered_issues_count": len(covered_task_ids),
        "requirement_coverage_pct": requirement_coverage_pct,
        "total_test_cases": len(test_cases),
        "executed_cases": executed_count,
        "execution_coverage_pct": execution_coverage_pct,
        "pass_rate_pct": pass_rate_pct,
        "status_breakdown": status_counts,
        "total_test_runs": total_runs,
        "linked_defects_count": len(open_defects),
        "plan_breakdown": plan_breakdown,
    }


def get_issue_qa_summary(db: Session, task_id: int) -> List[Dict[str, Any]]:
    cases = db.query(TestCase).filter(TestCase.linked_task_id == task_id).all()
    results = []
    for tc in cases:
        latest_exec = (
            db.query(TestExecution)
            .filter(TestExecution.test_case_id == tc.id)
            .order_by(TestExecution.id.desc())
            .first()
        )
        results.append({
            "id": tc.id,
            "case_key": tc.case_key or f"TC-{100 + tc.id}",
            "title": tc.title,
            "priority": tc.priority,
            "test_type": tc.test_type,
            "latest_status": latest_exec.status if latest_exec else "not_run",
            "defect_issue_key": latest_exec.defect_task.issue_key if latest_exec and latest_exec.defect_task else None,
        })
    return results
