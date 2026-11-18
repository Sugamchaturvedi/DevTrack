from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class DiscussionReplyCreate(BaseModel):
    content: str


class DiscussionReplyResponse(BaseModel):
    id: int
    discussion_id: int
    user_id: int
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DiscussionCreate(BaseModel):
    project_id: int
    title: str
    content: str


class DiscussionResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    title: str
    content: str
    created_at: datetime
    replies: List[DiscussionReplyResponse] = []

    model_config = ConfigDict(from_attributes=True)


class MeetingCreate(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    meeting_link: Optional[str] = None
    scheduled_time: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None


class MeetingResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    meeting_link: Optional[str] = None
    scheduled_time: datetime
    duration_minutes: int
    notes: Optional[str] = None
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_role: str = "all"  # all, faculty, student, hod
    department_id: Optional[int] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    target_role: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
