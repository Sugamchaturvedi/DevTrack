from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SprintBase(BaseModel):
    project_id: Optional[int] = None
    name: str
    goal: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: str = "planning"  # planning, active, completed


class SprintCreate(SprintBase):
    pass


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None


class SprintResponse(SprintBase):
    id: int
    total_tasks: Optional[int] = 0
    completed_tasks: Optional[int] = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserStoryBase(BaseModel):
    project_id: Optional[int] = None
    sprint_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    story_points: int = 1
    priority: str = "medium"
    status: str = "backlog"


class UserStoryCreate(UserStoryBase):
    pass


class UserStoryResponse(UserStoryBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
