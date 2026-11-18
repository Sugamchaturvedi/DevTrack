from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"  # open, todo, in_progress, blocked, in_review, testing, done, completed, backlog
    priority: str = "medium"  # lowest, low, medium, high, highest, urgent
    project_id: int
    issue_key: Optional[str] = None
    issue_type: str = "task"  # epic, story, task, bug, feature, improvement, subtask
    epic_id: Optional[int] = None
    reporter_id: Optional[int] = None
    story_points: int = 0
    labels: Optional[str] = None
    order_rank: float = 0.0
    assigned_to_id: Optional[int] = None
    team_id: Optional[int] = None
    sprint_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    progress_percentage: int = 0


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    project_id: Optional[int] = None
    issue_key: Optional[str] = None
    issue_type: Optional[str] = "task"
    epic_id: Optional[int] = None
    story_points: Optional[int] = 0
    labels: Optional[str] = None
    order_rank: Optional[float] = 0.0
    assigned_to_id: Optional[int] = None
    team_id: Optional[int] = None
    sprint_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = 0.0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    issue_type: Optional[str] = None
    epic_id: Optional[int] = None
    story_points: Optional[int] = None
    labels: Optional[str] = None
    order_rank: Optional[float] = None
    assigned_to_id: Optional[int] = None
    team_id: Optional[int] = None
    sprint_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    progress_percentage: Optional[int] = None


class TaskCommentCreate(BaseModel):
    content: str


class TaskCommentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    user_name: Optional[str] = None
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskResponse(TaskBase):
    id: int
    assigned_to_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    reporter_name: Optional[str] = None
    epic_title: Optional[str] = None
    project_name: Optional[str] = None
    subtask_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KanbanLane(BaseModel):
    status: str
    title: str
    category: str = "in_progress"
    color: str = "#3b82f6"
    wip_limit: int = 0
    total_story_points: int = 0
    tasks: List[TaskResponse] = []


class KanbanBoardResponse(BaseModel):
    project_id: int
    project_name: str
    lanes: List[KanbanLane] = []
