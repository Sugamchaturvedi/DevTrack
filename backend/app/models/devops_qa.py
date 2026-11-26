from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.database import Base


# ==============================================================================
# 1. GITHUB INTEGRATION MODELS
# ==============================================================================


class GitHubConnection(Base):
    __tablename__ = "github_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    github_username = Column(String(120), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    profile_url = Column(String(500), nullable=True)
    encrypted_token = Column(Text, nullable=False)
    token_hint = Column(String(20), nullable=True)
    scopes = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    connected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    repositories = relationship("GitHubRepository", back_populates="connection")


class GitHubRepository(Base):
    __tablename__ = "github_repositories"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    connection_id = Column(Integer, ForeignKey("github_connections.id", ondelete="SET NULL"), nullable=True, index=True)
    owner = Column(String(120), nullable=False)
    repo_name = Column(String(150), nullable=False)
    full_name = Column(String(255), nullable=False, index=True)
    html_url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    default_branch = Column(String(100), default="main", nullable=False)
    visibility = Column(String(30), default="public", nullable=False)
    language = Column(String(80), nullable=True)
    stars_count = Column(Integer, default=0, nullable=False)
    forks_count = Column(Integer, default=0, nullable=False)
    open_issues_count = Column(Integer, default=0, nullable=False)
    webhook_secret_encrypted = Column(Text, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    sync_status = Column(String(50), default="connected", nullable=False)
    sync_error = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    connection = relationship("GitHubConnection", back_populates="repositories")
    created_by = relationship("User", foreign_keys=[created_by_id])
    branches = relationship("GitHubBranch", back_populates="repository", cascade="all, delete-orphan")
    commits = relationship("GitHubCommit", back_populates="repository", cascade="all, delete-orphan")
    pull_requests = relationship("GitHubPullRequest", back_populates="repository", cascade="all, delete-orphan")
    activities = relationship("GitHubActivity", back_populates="repository", cascade="all, delete-orphan")


class GitHubBranch(Base):
    __tablename__ = "github_branches"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("github_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    head_sha = Column(String(64), nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    is_protected = Column(Boolean, default=False, nullable=False)
    last_commit_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    repository = relationship("GitHubRepository", back_populates="branches")
    task = relationship("Task")


class GitHubCommit(Base):
    __tablename__ = "github_commits"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("github_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    sha = Column(String(64), nullable=False, index=True)
    message = Column(Text, nullable=False)
    author_name = Column(String(150), nullable=True)
    author_email = Column(String(255), nullable=True)
    branch_name = Column(String(200), nullable=True)
    html_url = Column(String(500), nullable=True)
    issue_keys_detected = Column(String(255), nullable=True)
    committed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    repository = relationship("GitHubRepository", back_populates="commits")
    task = relationship("Task")


class GitHubPullRequest(Base):
    __tablename__ = "github_pull_requests"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("github_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    pr_number = Column(Integer, nullable=False, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    state = Column(String(30), default="open", nullable=False)  # open, closed, merged
    review_status = Column(String(50), default="pending", nullable=False)  # pending, approved, changes_requested, commented, none
    reviewer_names = Column(String(255), nullable=True)
    head_branch = Column(String(200), nullable=True)
    base_branch = Column(String(200), nullable=True)
    author_username = Column(String(120), nullable=True)
    html_url = Column(String(500), nullable=True)
    additions = Column(Integer, default=0, nullable=False)
    deletions = Column(Integer, default=0, nullable=False)
    changed_files = Column(Integer, default=0, nullable=False)
    merged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    repository = relationship("GitHubRepository", back_populates="pull_requests")
    task = relationship("Task")


class GitHubActivity(Base):
    __tablename__ = "github_activities"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("github_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # push, pull_request, pull_request_review, workflow_run, release, branch_link, sync
    actor = Column(String(120), nullable=True)
    summary = Column(Text, nullable=False)
    ref = Column(String(200), nullable=True)
    html_url = Column(String(500), nullable=True)
    issue_key = Column(String(50), nullable=True, index=True)
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    repository = relationship("GitHubRepository", back_populates="activities")


# ==============================================================================
# 2. CI/CD AND RELEASE MANAGEMENT MODELS (DEVOPS)
# ==============================================================================


class DeploymentEnvironment(Base):
    __tablename__ = "deployment_environments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(80), nullable=False)  # Development, Testing, Production
    slug = Column(String(80), nullable=False)
    url = Column(String(500), nullable=True)
    branch_name = Column(String(150), nullable=True)
    current_version = Column(String(100), nullable=True)
    status = Column(String(50), default="inactive", nullable=False)  # healthy, degraded, failed, inactive, deploying
    last_deployed_at = Column(DateTime, nullable=True)
    last_deployed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    last_deployed_by = relationship("User")


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id = Column(Integer, ForeignKey("github_repositories.id", ondelete="SET NULL"), nullable=True, index=True)
    environment_id = Column(Integer, ForeignKey("deployment_environments.id", ondelete="SET NULL"), nullable=True, index=True)
    external_run_id = Column(String(120), nullable=True, index=True)
    workflow_name = Column(String(200), nullable=False)
    branch = Column(String(200), default="main", nullable=False)
    commit_sha = Column(String(64), nullable=True)
    commit_message = Column(String(300), nullable=True)
    trigger_event = Column(String(60), default="webhook", nullable=False)  # push, pull_request, workflow_dispatch, webhook, api
    status = Column(String(50), default="completed", nullable=False)  # queued, in_progress, completed
    build_status = Column(String(50), default="pending", nullable=False)  # pending, running, success, failure, cancelled
    test_status = Column(String(50), default="pending", nullable=False)  # pending, running, passed, failed, skipped
    tests_total = Column(Integer, default=0, nullable=False)
    tests_passed = Column(Integer, default=0, nullable=False)
    tests_failed = Column(Integer, default=0, nullable=False)
    deployment_status = Column(String(50), default="not_deployed", nullable=False)  # not_deployed, pending, deploying, success, failure
    duration_seconds = Column(Integer, default=0, nullable=False)
    logs_url = Column(String(500), nullable=True)
    triggered_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    triggered_by_name = Column(String(120), nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    project = relationship("Project")
    repository = relationship("GitHubRepository")
    environment = relationship("DeploymentEnvironment")
    triggered_by = relationship("User")


class Release(Base):
    __tablename__ = "releases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id = Column(Integer, ForeignKey("github_repositories.id", ondelete="SET NULL"), nullable=True, index=True)
    environment_id = Column(Integer, ForeignKey("deployment_environments.id", ondelete="SET NULL"), nullable=True, index=True)
    pipeline_run_id = Column(Integer, ForeignKey("pipeline_runs.id", ondelete="SET NULL"), nullable=True)
    version = Column(String(100), nullable=False)
    tag_name = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    release_notes = Column(Text, nullable=True)
    is_prerelease = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="published", nullable=False)  # draft, published, deployed, rolled_back
    html_url = Column(String(500), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    released_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    repository = relationship("GitHubRepository")
    environment = relationship("DeploymentEnvironment")
    pipeline_run = relationship("PipelineRun")
    created_by = relationship("User")


class DeploymentHistory(Base):
    __tablename__ = "deployment_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(Integer, ForeignKey("deployment_environments.id", ondelete="CASCADE"), nullable=False, index=True)
    release_id = Column(Integer, ForeignKey("releases.id", ondelete="SET NULL"), nullable=True)
    pipeline_run_id = Column(Integer, ForeignKey("pipeline_runs.id", ondelete="SET NULL"), nullable=True)
    version = Column(String(100), nullable=False)
    commit_sha = Column(String(64), nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, in_progress, success, failure, rolled_back
    notes = Column(Text, nullable=True)
    deployed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    deployed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    environment = relationship("DeploymentEnvironment")
    release = relationship("Release")
    pipeline_run = relationship("PipelineRun")
    deployed_by = relationship("User")


# ==============================================================================
# 3. TEST CASE MANAGEMENT MODELS (SOFTWARE TESTING & QA)
# ==============================================================================


class TestPlan(Base):
    __tablename__ = "test_plans"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    status = Column(String(50), default="active", nullable=False)  # draft, active, completed, archived
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    sprint = relationship("Sprint")
    created_by = relationship("User")
    test_cases = relationship("TestCase", back_populates="test_plan")
    test_runs = relationship("TestRun", back_populates="test_plan")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    test_plan_id = Column(Integer, ForeignKey("test_plans.id", ondelete="SET NULL"), nullable=True, index=True)
    linked_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    case_key = Column(String(50), unique=True, index=True, nullable=True)
    title = Column(String(250), nullable=False)
    description = Column(Text, nullable=True)
    preconditions = Column(Text, nullable=True)
    steps_json = Column(Text, nullable=False, default="[]")  # JSON array of {step_no, action, expected}
    expected_result = Column(Text, nullable=False)
    priority = Column(String(30), default="medium", nullable=False)  # low, medium, high, critical
    test_type = Column(String(50), default="functional", nullable=False)  # functional, integration, unit, e2e, security, performance, regression
    status = Column(String(30), default="ready", nullable=False)  # draft, ready, deprecated
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    test_plan = relationship("TestPlan", back_populates="test_cases")
    linked_task = relationship("Task")
    created_by = relationship("User")
    executions = relationship("TestExecution", back_populates="test_case", cascade="all, delete-orphan")


class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    test_plan_id = Column(Integer, ForeignKey("test_plans.id", ondelete="SET NULL"), nullable=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    environment_name = Column(String(50), default="Testing", nullable=False)
    build_version = Column(String(100), nullable=True)
    status = Column(String(50), default="in_progress", nullable=False)  # planned, in_progress, completed
    executed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    test_plan = relationship("TestPlan", back_populates="test_runs")
    sprint = relationship("Sprint")
    executed_by = relationship("User")
    executions = relationship("TestExecution", back_populates="test_run", cascade="all, delete-orphan")


class TestExecution(Base):
    __tablename__ = "test_executions"

    id = Column(Integer, primary_key=True, index=True)
    test_run_id = Column(Integer, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), default="not_run", nullable=False, index=True)  # not_run, pass, fail, blocked
    actual_result = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    defect_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    executed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    executed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    test_run = relationship("TestRun", back_populates="executions")
    test_case = relationship("TestCase", back_populates="executions")
    defect_task = relationship("Task", foreign_keys=[defect_task_id])
    executed_by = relationship("User")
