from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(
        String(50),
        default="todo",
        nullable=False,
        index=True,
    )  # backlog, todo, in_progress, in_review, blocked, completed
    priority = Column(
        String(50),
        default="medium",
        nullable=False,
        index=True,
    )  # low, medium, high, urgent
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Advanced Enterprise, Jira & University additions
    issue_key = Column(String(50), unique=True, index=True, nullable=True)  # e.g. DEV-1001
    issue_type = Column(String(50), default="task", nullable=False, index=True)  # epic, story, task, bug, feature, improvement, subtask
    epic_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    story_points = Column(Integer, default=0, nullable=False)
    labels = Column(String(255), nullable=True)  # comma-separated labels
    order_rank = Column(Float, default=0.0, nullable=False)

    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    team_id = Column(Integer, ForeignKey("project_teams.id", ondelete="SET NULL"), nullable=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True, index=True)
    parent_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)

    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True, index=True)
    estimated_hours = Column(Float, default=0.0, nullable=False)
    actual_hours = Column(Float, default=0.0, nullable=False)
    progress_percentage = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="tasks")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tasks")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    reporter = relationship("User", foreign_keys=[reporter_id])
    team = relationship("ProjectTeam", back_populates="tasks")
    sprint = relationship("Sprint", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id], foreign_keys=[parent_task_id], back_populates="subtasks")
    subtasks = relationship("Task", foreign_keys=[parent_task_id], back_populates="parent_task", cascade="all, delete-orphan")
    epic = relationship("Task", remote_side=[id], foreign_keys=[epic_id], back_populates="child_issues")
    child_issues = relationship("Task", foreign_keys=[epic_id], back_populates="epic")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    dependencies = relationship("TaskDependency", foreign_keys="TaskDependency.task_id", back_populates="task", cascade="all, delete-orphan")
    work_logs = relationship("WorkLog", back_populates="task", cascade="all, delete-orphan")


class TaskComment(Base):
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    task = relationship("Task", back_populates="comments")
    user = relationship("User")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    depends_on_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    dependency_type = Column(String(50), default="blocks", nullable=False)  # blocks, finish_to_start

    task = relationship("Task", foreign_keys=[task_id], back_populates="dependencies")
    depends_on_task = relationship("Task", foreign_keys=[depends_on_task_id])
