from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.devops_qa import (
    DeploymentEnvironment,
    DeploymentHistory,
    PipelineRun,
    Release,
)
from app.models.user import User
from app.routes.jira_pm import _check_project_access
from app.schemas.devops_qa import (
    DeploymentHistoryResponse,
    DeploymentRecordCreate,
    EnvironmentCreate,
    EnvironmentResponse,
    PipelineRunCreate,
    PipelineRunResponse,
    ReleaseCreate,
    ReleaseResponse,
)
from app.services.devops_service import (
    create_environment,
    create_release,
    ensure_default_environments,
    record_deployment,
    record_pipeline_run,
)

router = APIRouter(
    prefix="/devops",
    tags=["CI/CD & Release Management"],
)


@router.get("/projects/{project_id}/overview")
def get_devops_overview(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    envs = ensure_default_environments(db, project_id)
    runs = db.query(PipelineRun).filter(PipelineRun.project_id == project_id).order_by(PipelineRun.started_at.desc()).all()
    releases = db.query(Release).filter(Release.project_id == project_id).order_by(Release.released_at.desc()).all()
    deployments = db.query(DeploymentHistory).filter(DeploymentHistory.project_id == project_id).order_by(DeploymentHistory.deployed_at.desc()).all()

    total_runs = len(runs)
    passed_builds = sum(1 for r in runs if r.build_status == "success")
    failed_builds = sum(1 for r in runs if r.build_status == "failure")
    build_success_rate = round((passed_builds / total_runs) * 100, 1) if total_runs > 0 else 0.0

    return {
        "project_id": project_id,
        "total_pipeline_runs": total_runs,
        "passed_builds": passed_builds,
        "failed_builds": failed_builds,
        "build_success_rate": build_success_rate,
        "total_releases": len(releases),
        "latest_release": releases[0].version if releases else None,
        "total_deployments": len(deployments),
        "environments": [
            {
                "id": e.id,
                "name": e.name,
                "slug": e.slug,
                "status": e.status,
                "current_version": e.current_version,
                "branch_name": e.branch_name,
                "url": e.url,
                "last_deployed_at": e.last_deployed_at,
            }
            for e in envs
        ],
    }


@router.get("/projects/{project_id}/environments", response_model=List[EnvironmentResponse])
def list_environments(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    envs = ensure_default_environments(db, project_id)
    return [
        {
            "id": e.id,
            "project_id": e.project_id,
            "name": e.name,
            "slug": e.slug,
            "url": e.url,
            "branch_name": e.branch_name,
            "current_version": e.current_version,
            "status": e.status,
            "last_deployed_at": e.last_deployed_at,
            "last_deployed_by_name": e.last_deployed_by.name if e.last_deployed_by else None,
        }
        for e in envs
    ]


@router.post("/projects/{project_id}/environments", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
def add_environment(
    project_id: int,
    env_in: EnvironmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    try:
        e = create_environment(db, project_id, env_in)
        return {
            "id": e.id,
            "project_id": e.project_id,
            "name": e.name,
            "slug": e.slug,
            "url": e.url,
            "branch_name": e.branch_name,
            "current_version": e.current_version,
            "status": e.status,
            "last_deployed_at": e.last_deployed_at,
            "last_deployed_by_name": None,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/projects/{project_id}/pipelines", response_model=List[PipelineRunResponse])
def list_pipelines(
    project_id: int,
    build_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    query = db.query(PipelineRun).filter(PipelineRun.project_id == project_id)
    if build_status:
        query = query.filter(PipelineRun.build_status == build_status)
    runs = query.order_by(PipelineRun.started_at.desc(), PipelineRun.id.desc()).limit(100).all()
    return [
        {
            "id": r.id,
            "project_id": r.project_id,
            "repository_id": r.repository_id,
            "environment_id": r.environment_id,
            "environment_name": r.environment.name if r.environment else None,
            "external_run_id": r.external_run_id,
            "workflow_name": r.workflow_name,
            "branch": r.branch,
            "commit_sha": r.commit_sha,
            "commit_message": r.commit_message,
            "trigger_event": r.trigger_event,
            "status": r.status,
            "build_status": r.build_status,
            "test_status": r.test_status,
            "tests_total": r.tests_total,
            "tests_passed": r.tests_passed,
            "tests_failed": r.tests_failed,
            "deployment_status": r.deployment_status,
            "duration_seconds": r.duration_seconds,
            "logs_url": r.logs_url,
            "triggered_by_name": r.triggered_by_name or (r.triggered_by.name if r.triggered_by else None),
            "started_at": r.started_at,
            "completed_at": r.completed_at,
        }
        for r in runs
    ]


@router.post("/projects/{project_id}/pipelines", response_model=PipelineRunResponse, status_code=status.HTTP_201_CREATED)
def record_project_pipeline(
    project_id: int,
    run_in: PipelineRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    try:
        r = record_pipeline_run(db, project_id, run_in, user_id=current_user.id, user_name=current_user.name)
        return {
            "id": r.id,
            "project_id": r.project_id,
            "repository_id": r.repository_id,
            "environment_id": r.environment_id,
            "environment_name": r.environment.name if r.environment else None,
            "external_run_id": r.external_run_id,
            "workflow_name": r.workflow_name,
            "branch": r.branch,
            "commit_sha": r.commit_sha,
            "commit_message": r.commit_message,
            "trigger_event": r.trigger_event,
            "status": r.status,
            "build_status": r.build_status,
            "test_status": r.test_status,
            "tests_total": r.tests_total,
            "tests_passed": r.tests_passed,
            "tests_failed": r.tests_failed,
            "deployment_status": r.deployment_status,
            "duration_seconds": r.duration_seconds,
            "logs_url": r.logs_url,
            "triggered_by_name": r.triggered_by_name,
            "started_at": r.started_at,
            "completed_at": r.completed_at,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/projects/{project_id}/releases", response_model=List[ReleaseResponse])
def list_releases(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    releases = db.query(Release).filter(Release.project_id == project_id).order_by(Release.released_at.desc()).all()
    return [
        {
            "id": rel.id,
            "project_id": rel.project_id,
            "repository_id": rel.repository_id,
            "environment_id": rel.environment_id,
            "environment_name": rel.environment.name if rel.environment else None,
            "pipeline_run_id": rel.pipeline_run_id,
            "version": rel.version,
            "tag_name": rel.tag_name,
            "title": rel.title,
            "release_notes": rel.release_notes,
            "is_prerelease": rel.is_prerelease,
            "status": rel.status,
            "html_url": rel.html_url,
            "created_by_name": rel.created_by.name if rel.created_by else None,
            "released_at": rel.released_at,
        }
        for rel in releases
    ]


@router.post("/projects/{project_id}/releases", response_model=ReleaseResponse, status_code=status.HTTP_201_CREATED)
def add_release(
    project_id: int,
    release_in: ReleaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    rel = create_release(db, project_id, release_in, user_id=current_user.id)
    return {
        "id": rel.id,
        "project_id": rel.project_id,
        "repository_id": rel.repository_id,
        "environment_id": rel.environment_id,
        "environment_name": rel.environment.name if rel.environment else None,
        "pipeline_run_id": rel.pipeline_run_id,
        "version": rel.version,
        "tag_name": rel.tag_name,
        "title": rel.title,
        "release_notes": rel.release_notes,
        "is_prerelease": rel.is_prerelease,
        "status": rel.status,
        "html_url": rel.html_url,
        "created_by_name": current_user.name,
        "released_at": rel.released_at,
    }


@router.get("/projects/{project_id}/deployments", response_model=List[DeploymentHistoryResponse])
def list_deployments(
    project_id: int,
    environment_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    query = db.query(DeploymentHistory).filter(DeploymentHistory.project_id == project_id)
    if environment_id:
        query = query.filter(DeploymentHistory.environment_id == environment_id)
    deps = query.order_by(DeploymentHistory.deployed_at.desc(), DeploymentHistory.id.desc()).limit(100).all()
    return [
        {
            "id": d.id,
            "project_id": d.project_id,
            "environment_id": d.environment_id,
            "environment_name": d.environment.name if d.environment else None,
            "release_id": d.release_id,
            "pipeline_run_id": d.pipeline_run_id,
            "version": d.version,
            "commit_sha": d.commit_sha,
            "status": d.status,
            "notes": d.notes,
            "deployed_by_name": d.deployed_by.name if d.deployed_by else None,
            "deployed_at": d.deployed_at,
        }
        for d in deps
    ]


@router.post("/projects/{project_id}/deployments", response_model=DeploymentHistoryResponse, status_code=status.HTTP_201_CREATED)
def add_deployment_record(
    project_id: int,
    dep_in: DeploymentRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    try:
        d = record_deployment(db, project_id, dep_in, user_id=current_user.id)
        return {
            "id": d.id,
            "project_id": d.project_id,
            "environment_id": d.environment_id,
            "environment_name": d.environment.name if d.environment else None,
            "release_id": d.release_id,
            "pipeline_run_id": d.pipeline_run_id,
            "version": d.version,
            "commit_sha": d.commit_sha,
            "status": d.status,
            "notes": d.notes,
            "deployed_by_name": current_user.name,
            "deployed_at": d.deployed_at,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
