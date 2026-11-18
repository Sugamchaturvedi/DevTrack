from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class WorkLogCreate(BaseModel):
    hours_spent: float
    description: Optional[str] = None
    logged_date: Optional[datetime] = None


class WorkLogResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    user_name: Optional[str] = None
    hours_spent: float
    description: Optional[str] = None
    logged_date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueDetailResponse(BaseModel):
    id: int
    issue_key: str
    issue_type: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    project_id: int
    project_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    reporter_id: Optional[int] = None
    reporter_name: Optional[str] = None
    epic_id: Optional[int] = None
    epic_title: Optional[str] = None
    sprint_id: Optional[int] = None
    sprint_name: Optional[str] = None
    story_points: int = 0
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    progress_percentage: int = 0
    labels: Optional[str] = None
    order_rank: float = 0.0
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    subtasks: List[Dict[str, Any]] = []
    dependencies: List[Dict[str, Any]] = []
    comments_count: int = 0
    work_logs: List[WorkLogResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EpicSummaryResponse(BaseModel):
    id: int
    issue_key: str
    title: str
    status: str
    priority: str
    story_points: int
    child_count: int
    completed_count: int
    progress_percentage: int
    labels: Optional[str] = None


class BacklogSprint(BaseModel):
    id: int
    name: str
    goal: Optional[str] = None
    status: str
    start_date: datetime
    end_date: datetime
    total_issues: int
    total_story_points: int
    issues: List[Dict[str, Any]] = []


class BacklogResponse(BaseModel):
    project_id: int
    project_name: str
    active_sprints: List[BacklogSprint] = []
    planned_sprints: List[BacklogSprint] = []
    product_backlog: List[Dict[str, Any]] = []
    total_backlog_story_points: int = 0
    epics: List[EpicSummaryResponse] = []


class ReorderIssueRequest(BaseModel):
    target_sprint_id: Optional[int] = None
    target_status: Optional[str] = None
    order_rank: Optional[float] = None


class RiskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "Technical"
    probability: str = "Medium"
    impact: str = "Medium"
    severity: str = "Medium"
    mitigation_plan: Optional[str] = None
    status: str = "identified"
    review_date: Optional[datetime] = None


class RiskResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    category: str
    probability: str
    impact: str
    severity: str
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    mitigation_plan: Optional[str] = None
    status: str
    review_date: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WikiPageCreate(BaseModel):
    title: str
    category: str = "General"
    content: str


class WikiPageResponse(BaseModel):
    id: int
    project_id: int
    title: str
    slug: str
    category: str
    content: str
    version: int
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkflowStatusDTO(BaseModel):
    id: Optional[int] = None
    code: str
    name: str
    category: str = "in_progress"
    color: str = "#3b82f6"
    order_index: int = 0
    wip_limit: int = 0


class WorkflowDTO(BaseModel):
    id: int
    project_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    project_type: str
    is_default: bool
    statuses: List[WorkflowStatusDTO] = []


class AutomationRuleCreate(BaseModel):
    name: str
    trigger_event: str
    conditions_json: Optional[str] = "{}"
    actions_json: str
    is_active: bool = True


class AutomationRuleResponse(BaseModel):
    id: int
    project_id: Optional[int] = None
    name: str
    trigger_event: str
    conditions_json: Optional[str] = None
    actions_json: str
    is_active: bool
    execution_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectTemplateResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str] = None
    default_structure_json: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
