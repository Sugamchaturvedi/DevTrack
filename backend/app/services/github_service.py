"""GitHub Integration Service
Handles encrypted PAT storage, live GitHub REST API v3 synchronization,
DevTrack issue-key detection (e.g. DEV-1001), PR code review tracking, and HMAC-verified webhooks.
"""
from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decrypt_secret, encrypt_secret
from app.models.devops_qa import (
    DeploymentEnvironment,
    DeploymentHistory,
    GitHubActivity,
    GitHubBranch,
    GitHubCommit,
    GitHubConnection,
    GitHubPullRequest,
    GitHubRepository,
    PipelineRun,
    Release,
)
from app.models.project import Project, ProjectMember
from app.models.system import ActivityLog, Notification
from app.models.task import Task

ISSUE_KEY_PATTERN = re.compile(r"\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+)\b")


def parse_repo_slug(repo_input: str) -> Tuple[str, str, str]:
    raw = repo_input.strip().rstrip("/")
    if raw.endswith(".git"):
        raw = raw[:-4]
    if "github.com/" in raw:
        slug = raw.split("github.com/", 1)[1]
    else:
        slug = raw
    parts = [p for p in slug.split("/") if p]
    if len(parts) < 2:
        raise ValueError("Repository must be in 'owner/repo' format or a valid GitHub repository URL")
    owner, repo_name = parts[0], parts[1]
    full_name = f"{owner}/{repo_name}"
    html_url = f"https://github.com/{full_name}"
    return owner, repo_name, html_url


def extract_issue_keys(text: Optional[str]) -> List[str]:
    if not text:
        return []
    seen = []
    for m in ISSUE_KEY_PATTERN.findall(text.upper()):
        if m not in seen:
            seen.append(m)
    return seen


def resolve_matching_task(db: Session, project_id: int, *texts: Optional[str]) -> Tuple[Optional[Task], List[str]]:
    keys: List[str] = []
    for txt in texts:
        for k in extract_issue_keys(txt):
            if k not in keys:
                keys.append(k)
    if not keys:
        return None, []
    for k in keys:
        task = (
            db.query(Task)
            .filter(Task.project_id == project_id, func.upper(Task.issue_key) == k)
            .first()
        )
        if task:
            return task, keys
    # Fallback: global match if cross-project key referenced
    for k in keys:
        task = db.query(Task).filter(func.upper(Task.issue_key) == k).first()
        if task:
            return task, keys
    return None, keys


def _github_headers(token: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "DevTrack-University-PMS",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _parse_gh_dt(dt_str: Optional[str]) -> datetime:
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def _notify_project_team(
    db: Session,
    project: Project,
    title: str,
    message: str,
    notification_type: str = "warning",
    reference_link: str = "#/devops",
) -> None:
    recipient_ids = set()
    if project.owner_id:
        recipient_ids.add(project.owner_id)
    if project.faculty_mentor_id:
        recipient_ids.add(project.faculty_mentor_id)
    if project.project_manager_id:
        recipient_ids.add(project.project_manager_id)
    members = db.query(ProjectMember.user_id).filter(ProjectMember.project_id == project.id).all()
    for (uid,) in members:
        recipient_ids.add(uid)
    for uid in recipient_ids:
        db.add(
            Notification(
                user_id=uid,
                title=title,
                message=message,
                notification_type=notification_type,
                reference_link=reference_link,
            )
        )


def connect_github_account(
    db: Session,
    user_id: int,
    access_token: str,
    fallback_username: Optional[str] = None,
) -> GitHubConnection:
    token = access_token.strip()
    token_hint = f"****{token[-4:]}" if len(token) >= 4 else "****"

    gh_username = (fallback_username or "").strip()
    avatar_url = None
    profile_url = None
    scopes = None
    is_verified = False

    # Validate token against GitHub REST API
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(f"{settings.github_api_base}/user", headers=_github_headers(token))
            if resp.status_code == 200:
                payload = resp.json()
                gh_username = payload.get("login") or gh_username
                avatar_url = payload.get("avatar_url")
                profile_url = payload.get("html_url")
                scopes = resp.headers.get("x-oauth-scopes", "")
                is_verified = True
            elif resp.status_code == 401:
                raise ValueError("GitHub rejected the access token (401 Unauthorized). Please verify your Personal Access Token.")
    except ValueError:
        raise
    except Exception:
        # Offline / restricted network environment fallback if username provided
        if not gh_username:
            raise ValueError("Could not reach GitHub API to verify token. Provide your GitHub username or check network connectivity.")

    if not gh_username:
        raise ValueError("GitHub username could not be determined from the token.")

    encrypted = encrypt_secret(token)
    existing = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).first()
    if existing:
        existing.github_username = gh_username
        existing.avatar_url = avatar_url
        existing.profile_url = profile_url or f"https://github.com/{gh_username}"
        existing.encrypted_token = encrypted
        existing.token_hint = token_hint
        existing.scopes = scopes
        existing.is_verified = is_verified
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        conn = existing
    else:
        conn = GitHubConnection(
            user_id=user_id,
            github_username=gh_username,
            avatar_url=avatar_url,
            profile_url=profile_url or f"https://github.com/{gh_username}",
            encrypted_token=encrypted,
            token_hint=token_hint,
            scopes=scopes,
            is_verified=is_verified,
            is_active=True,
        )
        db.add(conn)
        db.commit()
        db.refresh(conn)

    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="github_connection",
            entity_id=conn.id,
            action="connected",
            details=f"Connected GitHub account @{gh_username} (verified={is_verified})",
        )
    )
    db.commit()
    return conn


def link_repository(
    db: Session,
    project_id: int,
    user_id: int,
    repo_url_or_slug: str,
    default_branch: str = "main",
    webhook_secret: Optional[str] = None,
    use_my_connection: bool = True,
) -> GitHubRepository:
    owner, repo_name, html_url = parse_repo_slug(repo_url_or_slug)
    full_name = f"{owner}/{repo_name}"

    existing = (
        db.query(GitHubRepository)
        .filter(GitHubRepository.project_id == project_id, GitHubRepository.full_name == full_name)
        .first()
    )
    if existing:
        raise ValueError(f"Repository '{full_name}' is already linked to this project.")

    conn = None
    token = None
    if use_my_connection:
        conn = (
            db.query(GitHubConnection)
            .filter(GitHubConnection.user_id == user_id, GitHubConnection.is_active == True)
            .first()
        )
        if conn:
            token = decrypt_secret(conn.encrypted_token)

    repo = GitHubRepository(
        project_id=project_id,
        connection_id=conn.id if conn else None,
        owner=owner,
        repo_name=repo_name,
        full_name=full_name,
        html_url=html_url,
        default_branch=default_branch or "main",
        webhook_secret_encrypted=encrypt_secret(webhook_secret.strip()) if webhook_secret else None,
        sync_status="connected",
        created_by_id=user_id,
    )
    db.add(repo)

    project = db.query(Project).filter(Project.id == project_id).first()
    if project and not project.repo_url:
        project.repo_url = html_url

    db.flush()
    db.add(
        GitHubActivity(
            repository_id=repo.id,
            event_type="sync",
            actor="DevTrack",
            summary=f"Linked repository {full_name}",
            ref=repo.default_branch,
            html_url=html_url,
        )
    )
    db.add(
        ActivityLog(
            user_id=user_id,
            entity_type="github_repository",
            entity_id=repo.id,
            action="linked",
            details=f"Linked GitHub repo {full_name} to project #{project_id}",
        )
    )
    db.commit()
    db.refresh(repo)

    # Attempt immediate metadata/sync if GitHub API is reachable
    try:
        sync_repository(db, repo.id, user_id=user_id, token_override=token)
        db.refresh(repo)
    except Exception as exc:
        repo.sync_error = f"Initial remote sync notice: {str(exc)}"
        db.commit()
        db.refresh(repo)

    return repo


def sync_repository(
    db: Session,
    repo_id: int,
    user_id: Optional[int] = None,
    token_override: Optional[str] = None,
) -> Dict[str, Any]:
    repo = db.query(GitHubRepository).filter(GitHubRepository.id == repo_id).first()
    if not repo:
        raise ValueError("Repository not found")

    token = token_override
    if not token and repo.connection_id:
        conn = db.query(GitHubConnection).filter(GitHubConnection.id == repo.connection_id).first()
        if conn and conn.is_active:
            token = decrypt_secret(conn.encrypted_token)
    if not token and user_id:
        conn = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id, GitHubConnection.is_active == True).first()
        if conn:
            token = decrypt_secret(conn.encrypted_token)

    headers = _github_headers(token)
    base = f"{settings.github_api_base}/repos/{repo.full_name}"

    stats = {"branches": 0, "commits": 0, "pull_requests": 0, "workflow_runs": 0, "synced_remotely": False}

    try:
        with httpx.Client(timeout=12.0) as client:
            r_meta = client.get(base, headers=headers)
            if r_meta.status_code == 404:
                raise ValueError(f"GitHub repository '{repo.full_name}' not found or token lacks access.")
            if r_meta.status_code == 401:
                raise ValueError("GitHub token unauthorized for this repository.")
            if r_meta.status_code >= 400:
                raise ValueError(f"GitHub API returned status {r_meta.status_code}")

            meta = r_meta.json()
            repo.description = meta.get("description") or repo.description
            repo.default_branch = meta.get("default_branch") or repo.default_branch
            repo.visibility = "private" if meta.get("private") else "public"
            repo.language = meta.get("language")
            repo.stars_count = meta.get("stargazers_count", 0)
            repo.forks_count = meta.get("forks_count", 0)
            repo.open_issues_count = meta.get("open_issues_count", 0)
            repo.html_url = meta.get("html_url") or repo.html_url

            # 1. Sync Branches
            r_branches = client.get(f"{base}/branches?per_page=30", headers=headers)
            if r_branches.status_code == 200:
                for b in r_branches.json():
                    b_name = b.get("name", "")
                    sha = (b.get("commit") or {}).get("sha")
                    task, _ = resolve_matching_task(db, repo.project_id, b_name)
                    existing_b = (
                        db.query(GitHubBranch)
                        .filter(GitHubBranch.repository_id == repo.id, GitHubBranch.name == b_name)
                        .first()
                    )
                    if existing_b:
                        existing_b.head_sha = sha
                        existing_b.is_default = b_name == repo.default_branch
                        existing_b.is_protected = bool(b.get("protected", False))
                        if task and not existing_b.task_id:
                            existing_b.task_id = task.id
                    else:
                        db.add(
                            GitHubBranch(
                                repository_id=repo.id,
                                task_id=task.id if task else None,
                                name=b_name,
                                head_sha=sha,
                                is_default=(b_name == repo.default_branch),
                                is_protected=bool(b.get("protected", False)),
                            )
                        )
                    stats["branches"] += 1

            # 2. Sync Commits
            r_commits = client.get(f"{base}/commits?per_page=25", headers=headers)
            if r_commits.status_code == 200:
                for c in r_commits.json():
                    sha = c.get("sha", "")
                    commit_obj = c.get("commit") or {}
                    msg = commit_obj.get("message", "")
                    author = commit_obj.get("author") or {}
                    task, keys = resolve_matching_task(db, repo.project_id, msg)
                    existing_c = (
                        db.query(GitHubCommit)
                        .filter(GitHubCommit.repository_id == repo.id, GitHubCommit.sha == sha)
                        .first()
                    )
                    if not existing_c:
                        db.add(
                            GitHubCommit(
                                repository_id=repo.id,
                                task_id=task.id if task else None,
                                sha=sha,
                                message=msg,
                                author_name=author.get("name"),
                                author_email=author.get("email"),
                                branch_name=repo.default_branch,
                                html_url=c.get("html_url"),
                                issue_keys_detected=", ".join(keys) if keys else None,
                                committed_at=_parse_gh_dt(author.get("date")),
                            )
                        )
                        db.add(
                            GitHubActivity(
                                repository_id=repo.id,
                                event_type="push",
                                actor=author.get("name"),
                                summary=f"Commit {sha[:7]}: {msg.splitlines()[0][:120]}",
                                ref=repo.default_branch,
                                html_url=c.get("html_url"),
                                issue_key=keys[0] if keys else None,
                                occurred_at=_parse_gh_dt(author.get("date")),
                            )
                        )
                    elif task and not existing_c.task_id:
                        existing_c.task_id = task.id
                    stats["commits"] += 1

            # 3. Sync Pull Requests & Code Reviews
            r_prs = client.get(f"{base}/pulls?state=all&per_page=20", headers=headers)
            if r_prs.status_code == 200:
                for pr in r_prs.json():
                    pr_num = pr.get("number")
                    title = pr.get("title", "")
                    body = pr.get("body") or ""
                    head_ref = (pr.get("head") or {}).get("ref")
                    base_ref = (pr.get("base") or {}).get("ref")
                    merged_at = _parse_gh_dt(pr.get("merged_at")) if pr.get("merged_at") else None
                    pr_state = "merged" if merged_at else pr.get("state", "open")
                    task, keys = resolve_matching_task(db, repo.project_id, title, body, head_ref)

                    # Fetch PR review status from GitHub reviews endpoint
                    review_status = "pending"
                    reviewers: List[str] = []
                    r_rev = client.get(f"{base}/pulls/{pr_num}/reviews", headers=headers)
                    if r_rev.status_code == 200:
                        revs = r_rev.json()
                        if revs:
                            latest_state = None
                            for rv in revs:
                                rv_user = (rv.get("user") or {}).get("login")
                                if rv_user and rv_user not in reviewers:
                                    reviewers.append(rv_user)
                                st = (rv.get("state") or "").lower()
                                if st in ["approved", "changes_requested", "commented"]:
                                    latest_state = st
                            if latest_state:
                                review_status = latest_state

                    existing_pr = (
                        db.query(GitHubPullRequest)
                        .filter(GitHubPullRequest.repository_id == repo.id, GitHubPullRequest.pr_number == pr_num)
                        .first()
                    )
                    if existing_pr:
                        existing_pr.title = title
                        existing_pr.description = body
                        existing_pr.state = pr_state
                        existing_pr.review_status = review_status
                        existing_pr.reviewer_names = ", ".join(reviewers) if reviewers else None
                        existing_pr.head_branch = head_ref
                        existing_pr.base_branch = base_ref
                        existing_pr.merged_at = merged_at
                        if task and not existing_pr.task_id:
                            existing_pr.task_id = task.id
                    else:
                        db.add(
                            GitHubPullRequest(
                                repository_id=repo.id,
                                task_id=task.id if task else None,
                                pr_number=pr_num,
                                title=title,
                                description=body,
                                state=pr_state,
                                review_status=review_status,
                                reviewer_names=", ".join(reviewers) if reviewers else None,
                                head_branch=head_ref,
                                base_branch=base_ref,
                                author_username=(pr.get("user") or {}).get("login"),
                                html_url=pr.get("html_url"),
                                merged_at=merged_at,
                                created_at=_parse_gh_dt(pr.get("created_at")),
                            )
                        )
                    stats["pull_requests"] += 1

            # 4. Sync GitHub Actions Workflow Runs -> PipelineRun
            r_runs = client.get(f"{base}/actions/runs?per_page=15", headers=headers)
            if r_runs.status_code == 200:
                runs_data = r_runs.json().get("workflow_runs", [])
                project = db.query(Project).filter(Project.id == repo.project_id).first()
                for wr in runs_data:
                    ext_id = str(wr.get("id"))
                    gh_status = wr.get("status", "completed")  # queued, in_progress, completed
                    conclusion = wr.get("conclusion")  # success, failure, cancelled, skipped, null
                    if gh_status != "completed":
                        build_st = "running" if gh_status == "in_progress" else "pending"
                        test_st = "running" if gh_status == "in_progress" else "pending"
                    elif conclusion == "success":
                        build_st = "success"
                        test_st = "passed"
                    elif conclusion in ["failure", "timed_out", "action_required"]:
                        build_st = "failure"
                        test_st = "failed"
                    else:
                        build_st = conclusion or "cancelled"
                        test_st = "skipped"

                    started = _parse_gh_dt(wr.get("run_started_at") or wr.get("created_at"))
                    completed = _parse_gh_dt(wr.get("updated_at")) if gh_status == "completed" else None
                    dur = int((completed - started).total_seconds()) if completed and started else 0
                    if dur < 0:
                        dur = 0

                    existing_run = (
                        db.query(PipelineRun)
                        .filter(PipelineRun.project_id == repo.project_id, PipelineRun.external_run_id == ext_id)
                        .first()
                    )
                    if existing_run:
                        was_failure = existing_run.build_status == "failure"
                        existing_run.status = gh_status
                        existing_run.build_status = build_st
                        existing_run.test_status = test_st
                        existing_run.duration_seconds = dur
                        existing_run.completed_at = completed
                        if build_st == "failure" and not was_failure and project:
                            _notify_project_team(
                                db,
                                project,
                                title=f"Build Failed: {wr.get('name', 'Workflow')}",
                                message=f"GitHub Actions run on branch '{wr.get('head_branch')}' failed.",
                                notification_type="warning",
                                reference_link="#/devops",
                            )
                    else:
                        actor_login = (wr.get("actor") or {}).get("login")
                        new_run = PipelineRun(
                            project_id=repo.project_id,
                            repository_id=repo.id,
                            external_run_id=ext_id,
                            workflow_name=wr.get("name") or "GitHub Actions",
                            branch=wr.get("head_branch") or repo.default_branch,
                            commit_sha=wr.get("head_sha"),
                            commit_message=(wr.get("display_title") or "")[:290],
                            trigger_event=wr.get("event") or "push",
                            status=gh_status,
                            build_status=build_st,
                            test_status=test_st,
                            deployment_status="not_deployed",
                            duration_seconds=dur,
                            logs_url=wr.get("html_url"),
                            triggered_by_name=actor_login,
                            started_at=started,
                            completed_at=completed,
                        )
                        db.add(new_run)
                        if build_st == "failure" and project:
                            _notify_project_team(
                                db,
                                project,
                                title=f"Build Failed: {new_run.workflow_name}",
                                message=f"GitHub Actions run on '{new_run.branch}' failed ({wr.get('head_sha', '')[:7]}).",
                                notification_type="warning",
                                reference_link="#/devops",
                            )
                    stats["workflow_runs"] += 1

            repo.sync_status = "connected"
            repo.sync_error = None
            repo.last_synced_at = datetime.now(timezone.utc)
            stats["synced_remotely"] = True
            db.commit()
            return stats

    except Exception as exc:
        repo.sync_status = "error"
        repo.sync_error = str(exc)
        db.commit()
        raise ValueError(str(exc))


def process_github_webhook(
    db: Session,
    repo: GitHubRepository,
    event_type: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Process authenticated GitHub webhook deliveries (push, pull_request, pull_request_review, workflow_run, release)."""
    project = db.query(Project).filter(Project.id == repo.project_id).first()
    handled = {"event": event_type, "repository": repo.full_name, "processed": True}

    if event_type == "push":
        ref = payload.get("ref", "")
        branch_name = ref.replace("refs/heads/", "") if ref.startswith("refs/heads/") else ref
        pusher = (payload.get("pusher") or {}).get("name") or (payload.get("sender") or {}).get("login")
        head_commit = payload.get("head_commit") or {}

        # Upsert branch
        task_b, _ = resolve_matching_task(db, repo.project_id, branch_name)
        branch = db.query(GitHubBranch).filter(GitHubBranch.repository_id == repo.id, GitHubBranch.name == branch_name).first()
        if branch:
            branch.head_sha = head_commit.get("id") or payload.get("after")
            branch.last_commit_at = datetime.now(timezone.utc)
            if task_b and not branch.task_id:
                branch.task_id = task_b.id
        elif branch_name:
            db.add(
                GitHubBranch(
                    repository_id=repo.id,
                    task_id=task_b.id if task_b else None,
                    name=branch_name,
                    head_sha=head_commit.get("id") or payload.get("after"),
                    is_default=(branch_name == repo.default_branch),
                    last_commit_at=datetime.now(timezone.utc),
                )
            )

        commits_added = 0
        for c in payload.get("commits", []):
            sha = c.get("id") or c.get("sha")
            msg = c.get("message", "")
            author = c.get("author") or {}
            task, keys = resolve_matching_task(db, repo.project_id, msg, branch_name)
            if not db.query(GitHubCommit).filter(GitHubCommit.repository_id == repo.id, GitHubCommit.sha == sha).first():
                db.add(
                    GitHubCommit(
                        repository_id=repo.id,
                        task_id=task.id if task else None,
                        sha=sha,
                        message=msg,
                        author_name=author.get("name") or pusher,
                        author_email=author.get("email"),
                        branch_name=branch_name,
                        html_url=c.get("url"),
                        issue_keys_detected=", ".join(keys) if keys else None,
                        committed_at=_parse_gh_dt(c.get("timestamp")),
                    )
                )
                db.add(
                    GitHubActivity(
                        repository_id=repo.id,
                        event_type="push",
                        actor=author.get("name") or pusher,
                        summary=f"Pushed commit {sha[:7]} to {branch_name}: {msg.splitlines()[0][:100]}",
                        ref=branch_name,
                        html_url=c.get("url"),
                        issue_key=keys[0] if keys else None,
                    )
                )
                commits_added += 1
        handled["commits_added"] = commits_added

    elif event_type == "pull_request":
        pr = payload.get("pull_request") or {}
        pr_num = pr.get("number")
        title = pr.get("title", "")
        body = pr.get("body") or ""
        head_ref = (pr.get("head") or {}).get("ref")
        base_ref = (pr.get("base") or {}).get("ref")
        merged = bool(pr.get("merged"))
        pr_state = "merged" if merged else pr.get("state", "open")
        actor = (pr.get("user") or {}).get("login") or (payload.get("sender") or {}).get("login")
        task, keys = resolve_matching_task(db, repo.project_id, title, body, head_ref)

        existing_pr = db.query(GitHubPullRequest).filter(GitHubPullRequest.repository_id == repo.id, GitHubPullRequest.pr_number == pr_num).first()
        if existing_pr:
            existing_pr.title = title
            existing_pr.description = body
            existing_pr.state = pr_state
            existing_pr.head_branch = head_ref
            existing_pr.base_branch = base_ref
            existing_pr.additions = pr.get("additions", existing_pr.additions)
            existing_pr.deletions = pr.get("deletions", existing_pr.deletions)
            existing_pr.changed_files = pr.get("changed_files", existing_pr.changed_files)
            existing_pr.merged_at = _parse_gh_dt(pr.get("merged_at")) if merged else existing_pr.merged_at
            if task and not existing_pr.task_id:
                existing_pr.task_id = task.id
        else:
            db.add(
                GitHubPullRequest(
                    repository_id=repo.id,
                    task_id=task.id if task else None,
                    pr_number=pr_num,
                    title=title,
                    description=body,
                    state=pr_state,
                    review_status="pending",
                    head_branch=head_ref,
                    base_branch=base_ref,
                    author_username=actor,
                    html_url=pr.get("html_url"),
                    additions=pr.get("additions", 0),
                    deletions=pr.get("deletions", 0),
                    changed_files=pr.get("changed_files", 0),
                    merged_at=_parse_gh_dt(pr.get("merged_at")) if merged else None,
                )
            )
        db.add(
            GitHubActivity(
                repository_id=repo.id,
                event_type="pull_request",
                actor=actor,
                summary=f"PR #{pr_num} {payload.get('action', pr_state)}: {title}",
                ref=head_ref,
                html_url=pr.get("html_url"),
                issue_key=keys[0] if keys else None,
            )
        )

    elif event_type == "pull_request_review":
        pr = payload.get("pull_request") or {}
        rev = payload.get("review") or {}
        pr_num = pr.get("number")
        rev_state = (rev.get("state") or "commented").lower()
        reviewer = (rev.get("user") or {}).get("login")
        existing_pr = db.query(GitHubPullRequest).filter(GitHubPullRequest.repository_id == repo.id, GitHubPullRequest.pr_number == pr_num).first()
        if existing_pr:
            existing_pr.review_status = rev_state
            existing_revs = [r.strip() for r in (existing_pr.reviewer_names or "").split(",") if r.strip()]
            if reviewer and reviewer not in existing_revs:
                existing_revs.append(reviewer)
                existing_pr.reviewer_names = ", ".join(existing_revs)
        db.add(
            GitHubActivity(
                repository_id=repo.id,
                event_type="pull_request_review",
                actor=reviewer,
                summary=f"PR #{pr_num} review {rev_state} by @{reviewer}",
                html_url=rev.get("html_url") or pr.get("html_url"),
            )
        )

    elif event_type == "workflow_run":
        wr = payload.get("workflow_run") or {}
        ext_id = str(wr.get("id", ""))
        gh_status = wr.get("status", "completed")
        conclusion = wr.get("conclusion")
        if gh_status != "completed":
            build_st = "running" if gh_status == "in_progress" else "pending"
            test_st = "running" if gh_status == "in_progress" else "pending"
        elif conclusion == "success":
            build_st = "success"
            test_st = "passed"
        elif conclusion in ["failure", "timed_out"]:
            build_st = "failure"
            test_st = "failed"
        else:
            build_st = conclusion or "cancelled"
            test_st = "skipped"

        actor = (wr.get("actor") or {}).get("login")
        existing_run = db.query(PipelineRun).filter(PipelineRun.project_id == repo.project_id, PipelineRun.external_run_id == ext_id).first() if ext_id else None
        if existing_run:
            existing_run.status = gh_status
            existing_run.build_status = build_st
            existing_run.test_status = test_st
            existing_run.completed_at = datetime.now(timezone.utc) if gh_status == "completed" else None
        else:
            db.add(
                PipelineRun(
                    project_id=repo.project_id,
                    repository_id=repo.id,
                    external_run_id=ext_id or None,
                    workflow_name=wr.get("name") or "CI Workflow",
                    branch=wr.get("head_branch") or repo.default_branch,
                    commit_sha=wr.get("head_sha"),
                    commit_message=(wr.get("display_title") or "")[:290],
                    trigger_event="webhook",
                    status=gh_status,
                    build_status=build_st,
                    test_status=test_st,
                    deployment_status="not_deployed",
                    logs_url=wr.get("html_url"),
                    triggered_by_name=actor,
                    completed_at=datetime.now(timezone.utc) if gh_status == "completed" else None,
                )
            )
        if build_st == "failure" and project:
            _notify_project_team(
                db,
                project,
                title=f"CI Build Failed: {wr.get('name', 'Workflow')}",
                message=f"Workflow failed on branch '{wr.get('head_branch', repo.default_branch)}' in {repo.full_name}.",
                notification_type="warning",
                reference_link="#/devops",
            )
        db.add(
            GitHubActivity(
                repository_id=repo.id,
                event_type="workflow_run",
                actor=actor,
                summary=f"Workflow '{wr.get('name', 'CI')}' {gh_status} ({conclusion or 'running'})",
                ref=wr.get("head_branch"),
                html_url=wr.get("html_url"),
            )
        )

    elif event_type == "release":
        rel = payload.get("release") or {}
        tag = rel.get("tag_name")
        if tag:
            db.add(
                Release(
                    project_id=repo.project_id,
                    repository_id=repo.id,
                    version=tag,
                    tag_name=tag,
                    title=rel.get("name") or tag,
                    release_notes=rel.get("body"),
                    is_prerelease=bool(rel.get("prerelease", False)),
                    status="published",
                    html_url=rel.get("html_url"),
                    released_at=_parse_gh_dt(rel.get("published_at")),
                )
            )
            db.add(
                GitHubActivity(
                    repository_id=repo.id,
                    event_type="release",
                    actor=(rel.get("author") or {}).get("login"),
                    summary=f"Published release {tag}: {rel.get('name') or tag}",
                    ref=tag,
                    html_url=rel.get("html_url"),
                )
            )

    repo.last_synced_at = datetime.now(timezone.utc)
    db.commit()
    return handled


def get_issue_github_summary(db: Session, task_id: int) -> Dict[str, Any]:
    branches = db.query(GitHubBranch).filter(GitHubBranch.task_id == task_id).all()
    commits = (
        db.query(GitHubCommit)
        .filter(GitHubCommit.task_id == task_id)
        .order_by(GitHubCommit.committed_at.desc())
        .all()
    )
    prs = (
        db.query(GitHubPullRequest)
        .filter(GitHubPullRequest.task_id == task_id)
        .order_by(GitHubPullRequest.updated_at.desc())
        .all()
    )

    overall_review = "none"
    if prs:
        states = [p.review_status for p in prs]
        if "changes_requested" in states:
            overall_review = "changes_requested"
        elif "approved" in states:
            overall_review = "approved"
        elif "pending" in states:
            overall_review = "pending"
        else:
            overall_review = states[0]

    return {
        "code_review_status": overall_review,
        "branches": [
            {
                "id": b.id,
                "name": b.name,
                "head_sha": b.head_sha,
                "is_default": b.is_default,
                "repo_name": b.repository.full_name if b.repository else None,
            }
            for b in branches
        ],
        "commits": [
            {
                "id": c.id,
                "sha": c.sha[:7],
                "full_sha": c.sha,
                "message": c.message,
                "author_name": c.author_name,
                "html_url": c.html_url,
                "committed_at": c.committed_at,
            }
            for c in commits
        ],
        "pull_requests": [
            {
                "id": pr.id,
                "pr_number": pr.pr_number,
                "title": pr.title,
                "state": pr.state,
                "review_status": pr.review_status,
                "reviewer_names": pr.reviewer_names,
                "head_branch": pr.head_branch,
                "base_branch": pr.base_branch,
                "author_username": pr.author_username,
                "html_url": pr.html_url,
            }
            for pr in prs
        ],
    }
