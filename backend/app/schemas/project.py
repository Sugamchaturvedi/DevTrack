from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    objectives: Optional[str] = None
    scope: Optional[str] = None
    category: str = "Capstone"
    tech_stack: Optional[str] = "React, Python, FastAPI, PostgreSQL"
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "active"  # proposed, pending_approval, approved, planning, active, on_hold, completed, rejected, cancelled
    department_id: Optional[int] = None
    faculty_mentor_id: Optional[int] = None
    project_manager_id: Optional[int] = None
    completion_percentage: int = 0
    repo_url: Optional[str] = None
    live_demo_url: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    objectives: Optional[str] = None
    scope: Optional[str] = None
    category: Optional[str] = "Capstone"
    tech_stack: Optional[str] = "React, Python, FastAPI, PostgreSQL"
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "active"
    department_id: Optional[int] = None
    faculty_mentor_id: Optional[int] = None
    project_manager_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    objectives: Optional[str] = None
    scope: Optional[str] = None
    category: Optional[str] = None
    tech_stack: Optional[str] = None
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    department_id: Optional[int] = None
    faculty_mentor_id: Optional[int] = None
    project_manager_id: Optional[int] = None
    completion_percentage: Optional[int] = None
    repo_url: Optional[str] = None
    live_demo_url: Optional[str] = None


class ProjectMemberSchema(BaseModel):
    id: int
    project_id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    role_in_project: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMilestoneSchema(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = "pending"
    completion_date: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectResponse(ProjectBase):
    id: int
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    department_name: Optional[str] = None
    faculty_mentor_name: Optional[str] = None
    project_manager_name: Optional[str] = None
    task_count: Optional[int] = 0
    completed_task_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
