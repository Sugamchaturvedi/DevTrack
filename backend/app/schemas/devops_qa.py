from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# 1. GITHUB INTEGRATION SCHEMAS
# ==============================================================================


class GitHubConnectRequest(BaseModel):
    access_token: str = Field(..., min_length=6)
    github_username: Optional[str] = None


class GitHubConnectionResponse(BaseModel):
    id: int
    user_id: int
    github_username: str
    avatar_url: Optional[str] = None
    profile_url: Optional[str] = None
    token_hint: Optional[str] = None
    scopes: Optional[str] = None
    is_verified: bool
    is_active: bool
    connected_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GitHubRepoLinkRequest(BaseModel):
    repo_url_or_slug: str = Field(..., min_length=3)  # e.g. "owner/repo" or "https://github.com/owner/repo"
    default_branch: Optional[str] = "main"
    webhook_secret: Optional[str] = None
    use_my_connection: bool = True


class GitHubRepoResponse(BaseModel):
    id: int
    project_id: int
    owner: str
    repo_name: str
    full_name: str
    html_url: str
    description: Optional[str] = None
    default_branch: str
    visibility: str
    language: Optional[str] = None
    stars_count: int = 0
    forks_count: int = 0
    open_issues_count: int = 0
    has_webhook_secret: bool = False
    last_synced_at: Optional[datetime] = None
    sync_status: str
    sync_error: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GitHubBranchCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    head_sha: Optional[str] = None
    is_default: bool = False
    issue_key: Optional[str] = None


class GitHubBranchResponse(BaseModel):
    id: int
    repository_id: int
    task_id: Optional[int] = None
    issue_key: Optional[str] = None
    name: str
    head_sha: Optional[str] = None
    is_default: bool
    is_protected: bool
    last_commit_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GitHubCommitResponse(BaseModel):
    id: int
    repository_id: int
    task_id: Optional[int] = None
    issue_key: Optional[str] = None
    sha: str
    message: str
    author_name: Optional[str] = None
    author_email: Optional[str] = None
    branch_name: Optional[str] = None
    html_url: Optional[str] = None
    issue_keys_detected: Optional[str] = None
    committed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GitHubPullRequestResponse(BaseModel):
    id: int
    repository_id: int
    task_id: Optional[int] = None
    issue_key: Optional[str] = None
    pr_number: int
    title: str
    description: Optional[str] = None
    state: str
    review_status: str
    reviewer_names: Optional[str] = None
    head_branch: Optional[str] = None
    base_branch: Optional[str] = None
    author_username: Optional[str] = None
    html_url: Optional[str] = None
    additions: int = 0
    deletions: int = 0
    changed_files: int = 0
    merged_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GitHubActivityResponse(BaseModel):
    id: int
    repository_id: int
    event_type: str
    actor: Optional[str] = None
    summary: str
    ref: Optional[str] = None
    html_url: Optional[str] = None
    issue_key: Optional[str] = None
    occurred_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GitHubIssueLinkRequest(BaseModel):
    issue_key_or_id: str
    entity_type: str  # "branch" | "commit" | "pull_request"
    entity_id: int


# ==============================================================================
# 2. CI/CD AND RELEASE MANAGEMENT SCHEMAS (DEVOPS)
# ==============================================================================


class EnvironmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)  # Development, Testing, Production
    url: Optional[str] = None
    branch_name: Optional[str] = None


class EnvironmentResponse(BaseModel):
    id: int
    project_id: int
    name: str
    slug: str
    url: Optional[str] = None
    branch_name: Optional[str] = None
    current_version: Optional[str] = None
    status: str
    last_deployed_at: Optional[datetime] = None
    last_deployed_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PipelineRunCreate(BaseModel):
    workflow_name: str = Field(..., min_length=2, max_length=200)
    branch: str = "main"
    commit_sha: Optional[str] = None
    commit_message: Optional[str] = None
    trigger_event: str = "api"
    environment_id: Optional[int] = None
    repository_id: Optional[int] = None
    status: str = "completed"  # queued, in_progress, completed
    build_status: str = "pending"  # pending, running, success, failure, cancelled
    test_status: str = "pending"  # pending, running, passed, failed, skipped
    tests_total: int = 0
    tests_passed: int = 0
    tests_failed: int = 0
    deployment_status: str = "not_deployed"  # not_deployed, pending, deploying, success, failure
    duration_seconds: int = 0
    logs_url: Optional[str] = None
    external_run_id: Optional[str] = None


class PipelineRunResponse(BaseModel):
    id: int
    project_id: int
    repository_id: Optional[int] = None
    environment_id: Optional[int] = None
    environment_name: Optional[str] = None
    external_run_id: Optional[str] = None
    workflow_name: str
    branch: str
    commit_sha: Optional[str] = None
    commit_message: Optional[str] = None
    trigger_event: str
    status: str
    build_status: str
    test_status: str
    tests_total: int
    tests_passed: int
    tests_failed: int
    deployment_status: str
    duration_seconds: int
    logs_url: Optional[str] = None
    triggered_by_name: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReleaseCreate(BaseModel):
    version: str = Field(..., min_length=1, max_length=100)
    tag_name: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=200)
    release_notes: Optional[str] = None
    is_prerelease: bool = False
    status: str = "published"
    environment_id: Optional[int] = None
    pipeline_run_id: Optional[int] = None
    html_url: Optional[str] = None


class ReleaseResponse(BaseModel):
    id: int
    project_id: int
    repository_id: Optional[int] = None
    environment_id: Optional[int] = None
    environment_name: Optional[str] = None
    pipeline_run_id: Optional[int] = None
    version: str
    tag_name: str
    title: str
    release_notes: Optional[str] = None
    is_prerelease: bool
    status: str
    html_url: Optional[str] = None
    created_by_name: Optional[str] = None
    released_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeploymentRecordCreate(BaseModel):
    environment_id: int
    version: str = Field(..., min_length=1, max_length=100)
    commit_sha: Optional[str] = None
    release_id: Optional[int] = None
    pipeline_run_id: Optional[int] = None
    status: str = "pending"  # pending, in_progress, success, failure, rolled_back
    notes: Optional[str] = None


class DeploymentHistoryResponse(BaseModel):
    id: int
    project_id: int
    environment_id: int
    environment_name: Optional[str] = None
    release_id: Optional[int] = None
    pipeline_run_id: Optional[int] = None
    version: str
    commit_sha: Optional[str] = None
    status: str
    notes: Optional[str] = None
    deployed_by_name: Optional[str] = None
    deployed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# 3. TEST CASE MANAGEMENT SCHEMAS (SOFTWARE TESTING & QA)
# ==============================================================================


class TestPlanCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    objective: Optional[str] = None
    sprint_id: Optional[int] = None
    status: str = "active"


class TestPlanResponse(BaseModel):
    id: int
    project_id: int
    sprint_id: Optional[int] = None
    sprint_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    objective: Optional[str] = None
    status: str
    test_case_count: int = 0
    created_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestStepItem(BaseModel):
    step_no: int
    action: str
    expected: Optional[str] = ""


class TestCaseCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=250)
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: List[TestStepItem] = []
    expected_result: str = Field(..., min_length=1)
    priority: str = "medium"
    test_type: str = "functional"
    status: str = "ready"
    test_plan_id: Optional[int] = None
    linked_task_id: Optional[int] = None


class TestCaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: Optional[List[TestStepItem]] = None
    expected_result: Optional[str] = None
    priority: Optional[str] = None
    test_type: Optional[str] = None
    status: Optional[str] = None
    test_plan_id: Optional[int] = None
    linked_task_id: Optional[int] = None


class TestCaseResponse(BaseModel):
    id: int
    project_id: int
    test_plan_id: Optional[int] = None
    test_plan_name: Optional[str] = None
    linked_task_id: Optional[int] = None
    linked_issue_key: Optional[str] = None
    linked_issue_title: Optional[str] = None
    case_key: str
    title: str
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: List[Dict[str, Any]] = []
    expected_result: str
    priority: str
    test_type: str
    status: str
    latest_execution_status: Optional[str] = "not_run"
    created_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestRunCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    test_plan_id: Optional[int] = None
    sprint_id: Optional[int] = None
    environment_name: str = "Testing"
    build_version: Optional[str] = None
    test_case_ids: Optional[List[int]] = None  # If None and test_plan_id provided, include all plan cases; else all ready project cases


class TestExecutionUpdate(BaseModel):
    status: str = Field(..., pattern="^(not_run|pass|fail|blocked)$")
    actual_result: Optional[str] = None
    notes: Optional[str] = None


class TestExecutionResponse(BaseModel):
    id: int
    test_run_id: int
    test_case_id: int
    case_key: str
    case_title: str
    case_priority: str
    expected_result: str
    steps: List[Dict[str, Any]] = []
    linked_issue_key: Optional[str] = None
    status: str
    actual_result: Optional[str] = None
    notes: Optional[str] = None
    defect_task_id: Optional[int] = None
    defect_issue_key: Optional[str] = None
    executed_by_name: Optional[str] = None
    executed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TestRunResponse(BaseModel):
    id: int
    project_id: int
    test_plan_id: Optional[int] = None
    test_plan_name: Optional[str] = None
    sprint_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    environment_name: str
    build_version: Optional[str] = None
    status: str
    total_cases: int = 0
    passed_count: int = 0
    failed_count: int = 0
    blocked_count: int = 0
    not_run_count: int = 0
    pass_rate: float = 0.0
    executed_by_name: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
