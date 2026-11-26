from typing import Any, Dict, List, Optional
import json
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import decrypt_secret, verify_github_signature
from app.database.database import get_db
from app.models.devops_qa import (
    GitHubActivity,
    GitHubBranch,
    GitHubCommit,
    GitHubConnection,
    GitHubPullRequest,
    GitHubRepository,
)
from app.models.task import Task
from app.models.user import User
from app.routes.jira_pm import _check_project_access
from app.schemas.devops_qa import (
    GitHubActivityResponse,
    GitHubBranchCreate,
    GitHubBranchResponse,
    GitHubCommitResponse,
    GitHubConnectionResponse,
    GitHubConnectRequest,
    GitHubIssueLinkRequest,
    GitHubPullRequestResponse,
    GitHubRepoLinkRequest,
    GitHubRepoResponse,
)
from app.services.github_service import (
    connect_github_account,
    link_repository,
    process_github_webhook,
    resolve_matching_task,
    sync_repository,
)

router = APIRouter(
    prefix="/github",
    tags=["GitHub Integration"],
)


def _serialize_repo(repo: GitHubRepository) -> dict:
    return {
        "id": repo.id,
        "project_id": repo.project_id,
        "owner": repo.owner,
        "repo_name": repo.repo_name,
        "full_name": repo.full_name,
        "html_url": repo.html_url,
        "description": repo.description,
        "default_branch": repo.default_branch,
        "visibility": repo.visibility,
        "language": repo.language,
        "stars_count": repo.stars_count,
        "forks_count": repo.forks_count,
        "open_issues_count": repo.open_issues_count,
        "has_webhook_secret": bool(repo.webhook_secret_encrypted),
        "last_synced_at": repo.last_synced_at,
        "sync_status": repo.sync_status,
        "sync_error": repo.sync_error,
        "created_at": repo.created_at,
    }


@router.get("/connection", response_model=Optional[GitHubConnectionResponse])
def get_my_github_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == current_user.id, GitHubConnection.is_active == True)
        .first()
    )
    return conn


@router.post("/connect", response_model=GitHubConnectionResponse, status_code=status.HTTP_201_CREATED)
def connect_github(
    req: GitHubConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return connect_github_account(
            db,
            user_id=current_user.id,
            access_token=req.access_token,
            fallback_username=req.github_username,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/disconnect")
def disconnect_github(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = db.query(GitHubConnection).filter(GitHubConnection.user_id == current_user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="No GitHub account connected")
    db.delete(conn)
    db.commit()
    return {"message": "GitHub account disconnected and access token purged."}


@router.get("/projects/{project_id}/repos", response_model=List[GitHubRepoResponse])
def list_project_repos(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    repos = db.query(GitHubRepository).filter(GitHubRepository.project_id == project_id).order_by(GitHubRepository.id.desc()).all()
    return [_serialize_repo(r) for r in repos]


@router.post("/projects/{project_id}/repos", response_model=GitHubRepoResponse, status_code=status.HTTP_201_CREATED)
def link_project_repo(
    project_id: int,
    req: GitHubRepoLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    try:
        repo = link_repository(
            db,
            project_id=project_id,
            user_id=current_user.id,
            repo_url_or_slug=req.repo_url_or_slug,
            default_branch=req.default_branch or "main",
            webhook_secret=req.webhook_secret,
            use_my_connection=req.use_my_connection,
        )
        return _serialize_repo(repo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/projects/{project_id}/repos/{repo_id}")
def unlink_project_repo(
    project_id: int,
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    repo = db.query(GitHubRepository).filter(GitHubRepository.id == repo_id, GitHubRepository.project_id == project_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    db.delete(repo)
    db.commit()
    return {"message": f"Unlinked repository {repo.full_name}"}


@router.post("/projects/{project_id}/repos/{repo_id}/sync")
def sync_project_repo(
    project_id: int,
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    repo = db.query(GitHubRepository).filter(GitHubRepository.id == repo_id, GitHubRepository.project_id == project_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    try:
        stats = sync_repository(db, repo.id, user_id=current_user.id)
        return {"message": "Repository synchronized with GitHub", "stats": stats}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/projects/{project_id}/branches", response_model=List[GitHubBranchResponse])
def list_project_branches(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    repo_ids = [r.id for r in db.query(GitHubRepository.id).filter(GitHubRepository.project_id == project_id).all()]
    if not repo_ids:
        return []
    branches = db.query(GitHubBranch).filter(GitHubBranch.repository_id.in_(repo_ids)).order_by(GitHubBranch.is_default.desc(), GitHubBranch.id.desc()).all()
    return [
        {
            "id": b.id,
            "repository_id": b.repository_id,
            "task_id": b.task_id,
            "issue_key": b.task.issue_key if b.task else None,
            "name": b.name,
            "head_sha": b.head_sha,
            "is_default": b.is_default,
            "is_protected": b.is_protected,
            "last_commit_at": b.last_commit_at,
        }
        for b in branches
    ]


@router.post("/projects/{project_id}/repos/{repo_id}/branches", response_model=GitHubBranchResponse, status_code=status.HTTP_201_CREATED)
def add_project_branch(
    project_id: int,
    repo_id: int,
    req: GitHubBranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    repo = db.query(GitHubRepository).filter(GitHubRepository.id == repo_id, GitHubRepository.project_id == project_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    task = None
    if req.issue_key:
        task, _ = resolve_matching_task(db, project_id, req.issue_key)
    else:
        task, _ = resolve_matching_task(db, project_id, req.name)

    branch = GitHubBranch(
        repository_id=repo.id,
        task_id=task.id if task else None,
        name=req.name.strip(),
        head_sha=req.head_sha,
        is_default=req.is_default,
    )
    db.add(branch)
    db.add(
        GitHubActivity(
            repository_id=repo.id,
            event_type="branch_link",
            actor=current_user.name,
            summary=f"Created/linked branch '{branch.name}'" + (f" to {task.issue_key}" if task else ""),
            ref=branch.name,
            issue_key=task.issue_key if task else None,
        )
    )
    db.commit()
    db.refresh(branch)
    return {
        "id": branch.id,
        "repository_id": branch.repository_id,
        "task_id": branch.task_id,
        "issue_key": task.issue_key if task else None,
        "name": branch.name,
        "head_sha": branch.head_sha,
        "is_default": branch.is_default,
        "is_protected": branch.is_protected,
        "last_commit_at": branch.last_commit_at,
    }


@router.get("/projects/{project_id}/commits", response_model=List[GitHubCommitResponse])
def list_project_commits(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    repo_ids = [r.id for r in db.query(GitHubRepository.id).filter(GitHubRepository.project_id == project_id).all()]
    if not repo_ids:
        return []
    commits = db.query(GitHubCommit).filter(GitHubCommit.repository_id.in_(repo_ids)).order_by(GitHubCommit.committed_at.desc()).limit(100).all()
    return [
        {
            "id": c.id,
            "repository_id": c.repository_id,
            "task_id": c.task_id,
            "issue_key": c.task.issue_key if c.task else None,
            "sha": c.sha,
            "message": c.message,
            "author_name": c.author_name,
            "author_email": c.author_email,
            "branch_name": c.branch_name,
            "html_url": c.html_url,
            "issue_keys_detected": c.issue_keys_detected,
            "committed_at": c.committed_at,
        }
        for c in commits
    ]


@router.get("/projects/{project_id}/pulls", response_model=List[GitHubPullRequestResponse])
def list_project_pull_requests(
    project_id: int,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    repo_ids = [r.id for r in db.query(GitHubRepository.id).filter(GitHubRepository.project_id == project_id).all()]
    if not repo_ids:
        return []
    query = db.query(GitHubPullRequest).filter(GitHubPullRequest.repository_id.in_(repo_ids))
    if state:
        query = query.filter(GitHubPullRequest.state == state)
    prs = query.order_by(GitHubPullRequest.updated_at.desc(), GitHubPullRequest.pr_number.desc()).all()
    return [
        {
            "id": pr.id,
            "repository_id": pr.repository_id,
            "task_id": pr.task_id,
            "issue_key": pr.task.issue_key if pr.task else None,
            "pr_number": pr.pr_number,
            "title": pr.title,
            "description": pr.description,
            "state": pr.state,
            "review_status": pr.review_status,
            "reviewer_names": pr.reviewer_names,
            "head_branch": pr.head_branch,
            "base_branch": pr.base_branch,
            "author_username": pr.author_username,
            "html_url": pr.html_url,
            "additions": pr.additions,
            "deletions": pr.deletions,
            "changed_files": pr.changed_files,
            "merged_at": pr.merged_at,
            "created_at": pr.created_at,
            "updated_at": pr.updated_at,
        }
        for pr in prs
    ]


@router.get("/projects/{project_id}/activity", response_model=List[GitHubActivityResponse])
def list_project_github_activity(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    repo_ids = [r.id for r in db.query(GitHubRepository.id).filter(GitHubRepository.project_id == project_id).all()]
    if not repo_ids:
        return []
    return (
        db.query(GitHubActivity)
        .filter(GitHubActivity.repository_id.in_(repo_ids))
        .order_by(GitHubActivity.occurred_at.desc())
        .limit(60)
        .all()
    )


@router.post("/projects/{project_id}/link-issue")
def link_github_entity_to_issue(
    project_id: int,
    req: GitHubIssueLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(project_id, current_user, db)
    key_or_id = req.issue_key_or_id.strip()
    if key_or_id.isdigit():
        task = db.query(Task).filter(or_(Task.id == int(key_or_id), Task.issue_key == key_or_id)).first()
    else:
        task = db.query(Task).filter(func.upper(Task.issue_key) == key_or_id.upper()).first()
    if not task or task.project_id != project_id:
        raise HTTPException(status_code=404, detail=f"Issue '{key_or_id}' not found in this project")

    repo_ids = [r.id for r in db.query(GitHubRepository.id).filter(GitHubRepository.project_id == project_id).all()]
    if req.entity_type == "branch":
        entity = db.query(GitHubBranch).filter(GitHubBranch.id == req.entity_id, GitHubBranch.repository_id.in_(repo_ids)).first()
    elif req.entity_type == "commit":
        entity = db.query(GitHubCommit).filter(GitHubCommit.id == req.entity_id, GitHubCommit.repository_id.in_(repo_ids)).first()
    elif req.entity_type == "pull_request":
        entity = db.query(GitHubPullRequest).filter(GitHubPullRequest.id == req.entity_id, GitHubPullRequest.repository_id.in_(repo_ids)).first()
    else:
        raise HTTPException(status_code=400, detail="entity_type must be branch, commit, or pull_request")

    if not entity:
        raise HTTPException(status_code=404, detail=f"{req.entity_type} not found")

    entity.task_id = task.id
    db.commit()
    return {"message": f"Linked {req.entity_type} #{req.entity_id} to issue {task.issue_key}", "issue_key": task.issue_key}


@router.post("/webhooks/{repo_id}")
async def receive_github_webhook(
    repo_id: int,
    request: Request,
    x_github_event: str = Header(default="push", alias="X-GitHub-Event"),
    x_hub_signature_256: Optional[str] = Header(default=None, alias="X-Hub-Signature-256"),
    db: Session = Depends(get_db),
):
    repo = db.query(GitHubRepository).filter(GitHubRepository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository webhook target not found")

    raw_body = await request.body()
    secret = decrypt_secret(repo.webhook_secret_encrypted) if repo.webhook_secret_encrypted else settings.github_webhook_secret
    if secret and not verify_github_signature(raw_body, secret, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid GitHub webhook signature")

    try:
        payload: Dict[str, Any] = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    return process_github_webhook(db, repo, x_github_event, payload)
