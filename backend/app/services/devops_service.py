"""DevOps, CI/CD Pipeline & Release Management Service
Tracks real pipeline runs, failed build notifications, releases, release notes,
and environment deployments (Development, Testing, Production).
"""
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.devops_qa import (
    DeploymentEnvironment,
    DeploymentHistory,
    PipelineRun,
    Release,
)
from app.models.project import Project, ProjectMember
from app.models.system import ActivityLog, Notification
from app.schemas.devops_qa import (
    DeploymentRecordCreate,
    EnvironmentCreate,
    PipelineRunCreate,
    ReleaseCreate,
)


def ensure_default_environments(db: Session, project_id: int) -> List[DeploymentEnvironment]:
    existing = (
        db.query(DeploymentEnvironment)
        .filter(DeploymentEnvironment.project_id == project_id)
        .order_by(DeploymentEnvironment.id.asc())
        .all()
    )
    if existing:
        return existing

    defaults = [
        ("Development", "development", "develop"),
        ("Testing", "testing", "staging"),
        ("Production", "production", "main"),
    ]
    created = []
    for name, slug, branch in defaults:
        env = DeploymentEnvironment(
            project_id=project_id,
            name=name,
            slug=slug,
            branch_name=branch,
            status="inactive",
        )
        db.add(env)
        created.append(env)
    db.commit()
    for env in created:
        db.refresh(env)
    return created


def create_environment(db: Session, project_id: int, env_in: EnvironmentCreate) -> DeploymentEnvironment:
    slug = env_in.name.strip().lower().replace(" ", "-")
    existing = (
        db.query(DeploymentEnvironment)
        .filter(DeploymentEnvironment.project_id == project_id, DeploymentEnvironment.slug == slug)
        .first()
    )
    if existing:
        raise ValueError(f"Environment '{env_in.name}' already exists for this project.")

    env = DeploymentEnvironment(
        project_id=project_id,
        name=env_in.name.strip(),
        slug=slug,
        url=env_in.url,
        branch_name=env_in.branch_name,
        status="inactive",
    )
    db.add(env)
    db.commit()
    db.refresh(env)
    return env


def _send_failure_notifications(db: Session, project: Project, title: str, message: str) -> None:
    recipient_ids = set()
    if project.owner_id:
        recipient_ids.add(project.owner_id)
    if project.faculty_mentor_id:
        recipient_ids.add(project.faculty_mentor_id)
    if project.project_manager_id:
        recipient_ids.add(project.project_manager_id)
    for (uid,) in db.query(ProjectMember.user_id).filter(ProjectMember.project_id == project.id).all():
        recipient_ids.add(uid)

    for uid in recipient_ids:
        db.add(
            Notification(
                user_id=uid,
                title=title,
                message=message,
                notification_type="warning",
                reference_link="#/devops",
            )
        )


def record_pipeline_run(
    db: Session,
    project_id: int,
    run_in: PipelineRunCreate,
    user_id: Optional[int] = None,
    user_name: Optional[str] = None,
) -> PipelineRun:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found")

    completed_at = datetime.now(timezone.utc) if run_in.status == "completed" else None
    run = PipelineRun(
        project_id=project_id,
        repository_id=run_in.repository_id,
        environment_id=run_in.environment_id,
        external_run_id=run_in.external_run_id,
        workflow_name=run_in.workflow_name,
        branch=run_in.branch,
        commit_sha=run_in.commit_sha,
        commit_message=run_in.commit_message,
        trigger_event=run_in.trigger_event,
        status=run_in.status,
        build_status=run_in.build_status,
        test_status=run_in.test_status,
        tests_total=run_in.tests_total,
        tests_passed=run_in.tests_passed,
        tests_failed=run_in.tests_failed,
        deployment_status=run_in.deployment_status,
        duration_seconds=run_in.duration_seconds,
        logs_url=run_in.logs_url,
        triggered_by_id=user_id,
        triggered_by_name=user_name,
        completed_at=completed_at,
    )
    db.add(run)
    db.flush()

    # Notify on build, test, or deployment failure
    if run.build_status == "failure" or run.test_status == "failed" or run.deployment_status == "failure":
        _send_failure_notifications(
            db,
            project,
            title=f"Pipeline Failure: {run.workflow_name}",
            message=f"Build/Test failed on branch '{run.branch}' (build={run.build_status}, test={run.test_status}, deploy={run.deployment_status}).",
        )

    # Update environment status if deployment occurred
    if run.environment_id and run.deployment_status in ["success", "failure", "deploying"]:
        env = db.query(DeploymentEnvironment).filter(DeploymentEnvironment.id == run.environment_id).first()
        if env:
            env.status = "healthy" if run.deployment_status == "success" else ("failed" if run.deployment_status == "failure" else "deploying")
            if run.deployment_status == "success":
                env.last_deployed_at = datetime.now(timezone.utc)
                env.last_deployed_by_id = user_id

    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="pipeline_run",
            entity_id=run.id,
            action="recorded",
            details=f"CI/CD Pipeline '{run.workflow_name}' on {run.branch}: build={run.build_status}, tests={run.test_status}",
        )
    )
    db.commit()
    db.refresh(run)
    return run


def create_release(
    db: Session,
    project_id: int,
    release_in: ReleaseCreate,
    user_id: int,
) -> Release:
    release = Release(
        project_id=project_id,
        environment_id=release_in.environment_id,
        pipeline_run_id=release_in.pipeline_run_id,
        version=release_in.version.strip(),
        tag_name=release_in.tag_name.strip(),
        title=release_in.title.strip(),
        release_notes=release_in.release_notes,
        is_prerelease=release_in.is_prerelease,
        status=release_in.status,
        html_url=release_in.html_url,
        created_by_id=user_id,
    )
    db.add(release)
    db.flush()
    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="release",
            entity_id=release.id,
            action="created",
            details=f"Published release {release.version} ({release.tag_name})",
        )
    )
    db.commit()
    db.refresh(release)
    return release


def record_deployment(
    db: Session,
    project_id: int,
    dep_in: DeploymentRecordCreate,
    user_id: int,
) -> DeploymentHistory:
    env = (
        db.query(DeploymentEnvironment)
        .filter(DeploymentEnvironment.id == dep_in.environment_id, DeploymentEnvironment.project_id == project_id)
        .first()
    )
    if not env:
        raise ValueError("Deployment environment not found for this project.")

    dep = DeploymentHistory(
        project_id=project_id,
        environment_id=dep_in.environment_id,
        release_id=dep_in.release_id,
        pipeline_run_id=dep_in.pipeline_run_id,
        version=dep_in.version.strip(),
        commit_sha=dep_in.commit_sha,
        status=dep_in.status,
        notes=dep_in.notes,
        deployed_by_id=user_id,
    )
    db.add(dep)

    if dep_in.status == "success":
        env.current_version = dep.version
        env.status = "healthy"
        env.last_deployed_at = datetime.now(timezone.utc)
        env.last_deployed_by_id = user_id
    elif dep_in.status == "failure":
        env.status = "failed"
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            _send_failure_notifications(
                db,
                project,
                title=f"Deployment Failed ({env.name})",
                message=f"Deployment of version {dep.version} to {env.name} failed.",
            )
    elif dep_in.status == "in_progress":
        env.status = "deploying"
    elif dep_in.status == "rolled_back":
        env.status = "degraded"

    db.flush()
    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="deployment",
            entity_id=dep.id,
            action=dep_in.status,
            details=f"Deployment {dep.version} to {env.name}: {dep_in.status}",
        )
    )
    db.commit()
    db.refresh(dep)
    return dep
