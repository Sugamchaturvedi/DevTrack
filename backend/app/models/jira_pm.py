from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.database import Base


class WorkLog(Base):
    __tablename__ = "work_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    hours_spent = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    logged_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    task = relationship("Task", back_populates="work_logs")
    user = relationship("User")


class ProjectWorkflow(Base):
    __tablename__ = "project_workflows"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(String(50), default="standard", nullable=False)  # academic, software, research, capstone
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    statuses = relationship("WorkflowStatus", back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowStatus.order_index")
    transitions = relationship("WorkflowTransition", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowStatus(Base):
    __tablename__ = "workflow_statuses"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("project_workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=False)  # open, todo, in_progress, blocked, in_review, testing, done
    name = Column(String(100), nullable=False)  # Display Name
    category = Column(String(50), default="in_progress", nullable=False)  # todo, in_progress, done
    color = Column(String(20), default="#3b82f6", nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    wip_limit = Column(Integer, default=0, nullable=False)  # 0 = unlimited

    workflow = relationship("ProjectWorkflow", back_populates="statuses")


class WorkflowTransition(Base):
    __tablename__ = "workflow_transitions"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("project_workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status_code = Column(String(50), nullable=False)  # "*" means any status
    to_status_code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=True)
    required_role = Column(String(50), nullable=True)

    workflow = relationship("ProjectWorkflow", back_populates="transitions")


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(150), nullable=False)
    trigger_event = Column(String(100), nullable=False)  # task_created, status_changed, task_overdue, submission_received, sprint_ended
    conditions_json = Column(Text, nullable=True)  # JSON formatted conditions
    actions_json = Column(Text, nullable=False)  # JSON formatted actions
    is_active = Column(Boolean, default=True, nullable=False)
    execution_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    logs = relationship("AutomationLog", back_populates="rule", cascade="all, delete-orphan", order_by="AutomationLog.executed_at.desc()")


class AutomationLog(Base):
    __tablename__ = "automation_logs"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("automation_rules.id", ondelete="CASCADE"), nullable=False, index=True)
    trigger_event = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    status = Column(String(50), default="success", nullable=False)  # success, skipped, failed
    details = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    rule = relationship("AutomationRule", back_populates="logs")


class ProjectRisk(Base):
    __tablename__ = "project_risks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="Technical", nullable=False)  # Technical, Schedule, Resource, Scope, Security
    probability = Column(String(50), default="Medium", nullable=False)  # Low, Medium, High
    impact = Column(String(50), default="Medium", nullable=False)  # Low, Medium, High
    severity = Column(String(50), default="Medium", nullable=False)  # Low, Medium, High, Critical
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    mitigation_plan = Column(Text, nullable=True)
    status = Column(String(50), default="identified", nullable=False)  # identified, mitigating, closed
    review_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    owner = relationship("User")


class WikiPage(Base):
    __tablename__ = "wiki_pages"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), nullable=False, index=True)
    category = Column(String(100), default="General", nullable=False)  # Architecture, Meeting Notes, Research, Setup, API Specs
    content = Column(Text, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project")
    author = relationship("User")


class SavedFilter(Base):
    __tablename__ = "saved_filters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    filter_criteria = Column(Text, nullable=False)  # JSON query criteria
    is_favorite = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")


class ProjectTemplate(Base):
    __tablename__ = "project_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default="Software", nullable=False)  # Software Development, Research, Capstone, Agile Scrum, Data Science, IoT
    description = Column(Text, nullable=True)
    default_structure_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
