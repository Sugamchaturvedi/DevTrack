"""Seed script for Jira & Enterprise PM Templates, Workflows, and Initial Sample Epics/Stories"""
import json
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.database.database import SessionLocal
from app.models.jira_pm import (
    ProjectWorkflow,
    WorkflowStatus,
    WorkflowTransition,
    ProjectTemplate,
    AutomationRule,
)
from app.models.task import Task
from app.models.project import Project


def seed_jira_pm():
    db = SessionLocal()
    try:
        # 1. Default Workflows
        if not db.query(ProjectWorkflow).filter(ProjectWorkflow.is_default == True).first():
            wf = ProjectWorkflow(
                name="University Standard Agile Workflow",
                description="Default multi-stage academic & software workflow with code review and testing stages.",
                project_type="standard",
                is_default=True,
            )
            db.add(wf)
            db.flush()

            statuses_data = [
                ("open", "Open", "todo", "#94a3b8", 0, 0),
                ("todo", "To Do", "todo", "#3b82f6", 1, 0),
                ("in_progress", "In Progress", "in_progress", "#f59e0b", 2, 5),
                ("blocked", "Blocked", "in_progress", "#ef4444", 3, 0),
                ("in_review", "In Review", "in_progress", "#8b5cf6", 4, 3),
                ("testing", "Testing", "in_progress", "#06b6d4", 5, 4),
                ("done", "Done", "done", "#10b981", 6, 0),
            ]
            for code, name, cat, color, order, wip in statuses_data:
                db.add(WorkflowStatus(
                    workflow_id=wf.id,
                    code=code,
                    name=name,
                    category=cat,
                    color=color,
                    order_index=order,
                    wip_limit=wip,
                ))

            transitions_data = [
                ("*", "open", "Create / Reopen", None),
                ("open", "todo", "Move to Backlog / To Do", None),
                ("todo", "in_progress", "Start Working", None),
                ("in_progress", "blocked", "Flag Impediment", None),
                ("blocked", "in_progress", "Resolve Impediment", None),
                ("in_progress", "in_review", "Submit Code Review", None),
                ("in_review", "in_progress", "Request Rework", None),
                ("in_review", "testing", "Approve & Test", None),
                ("testing", "in_progress", "Test Failed", None),
                ("testing", "done", "Verify & Complete", None),
            ]
            for f, t, n, r in transitions_data:
                db.add(WorkflowTransition(
                    workflow_id=wf.id,
                    from_status_code=f,
                    to_status_code=t,
                    name=n,
                    required_role=r,
                ))

        # 2. Project Templates
        if db.query(ProjectTemplate).count() == 0:
            templates = [
                {
                    "name": "Software Development (Full-Stack Agile)",
                    "category": "Software",
                    "description": "Tailored for software engineering and capstone computer science projects with Epic/Story/Task hierarchy, CI/CD milestones, and code review.",
                    "default_structure_json": json.dumps({
                        "epics": ["Architecture & Database Schema", "Authentication & Security", "Core Business Logic", "Frontend UI / UX", "Testing & Deployment"],
                        "milestones": ["Sprint 1 - Foundations", "Sprint 2 - MVP Deliverable", "Final Code Review & Defence"],
                    }),
                },
                {
                    "name": "Research & Thesis Project",
                    "category": "Research",
                    "description": "Structured academic thesis framework: Literature Review, Methodology, Data Collection, Experimentation, and Manuscript Submission.",
                    "default_structure_json": json.dumps({
                        "epics": ["Literature Review & Survey", "Hypothesis & Methodology", "Experimental Setup & Trials", "Analysis of Results", "Thesis Drafting & Viva"],
                        "milestones": ["Proposal Approved", "Mid-term Defense", "Final Submission"],
                    }),
                },
                {
                    "name": "Final Year Capstone Project",
                    "category": "Capstone",
                    "description": "Comprehensive engineering capstone project with multi-disciplinary supervision, progress milestones, and rubrics.",
                    "default_structure_json": json.dumps({
                        "epics": ["Requirements Specification", "System Design & Prototyping", "Implementation Phase", "Integration & Quality Assurance", "Project Documentation"],
                        "milestones": ["Synposis Submission", "Progress Evaluation 1", "Final Viva & Exhibition"],
                    }),
                },
                {
                    "name": "Data Science & AI / ML Pipeline",
                    "category": "Data Science",
                    "description": "End-to-end data pipeline: dataset acquisition, cleaning, EDA, feature engineering, model training, evaluation, and inference deployment.",
                    "default_structure_json": json.dumps({
                        "epics": ["Data Collection & Ingestion", "Exploratory Data Analysis", "Feature Engineering & Preprocessing", "Model Architecture & Training", "MLOps & API Serving"],
                        "milestones": ["Baseline Model Benchmark", "Production Model Candidate", "Model Report & Demo"],
                    }),
                },
                {
                    "name": "IoT & Embedded Hardware System",
                    "category": "IoT",
                    "description": "Embedded microcontrollers, sensor telemetry, edge computing, wireless communications, and cloud dashboard integration.",
                    "default_structure_json": json.dumps({
                        "epics": ["Hardware Circuit Design", "Firmware & Sensor Drivers", "Communication Protocol (MQTT/HTTP)", "Cloud Backend & Telemetry", "Enclosure & Field Testing"],
                        "milestones": ["Breadboard Prototype", "PCB Fabrication", "Field Demonstration"],
                    }),
                },
            ]
            for tmpl in templates:
                db.add(ProjectTemplate(**tmpl))

        # 3. Default Automation Rules
        if db.query(AutomationRule).count() == 0:
            sample_rules = [
                {
                    "name": "Notify Supervisor when Task is Blocked",
                    "trigger_event": "status_changed",
                    "conditions_json": json.dumps({"target_status": "blocked"}),
                    "actions_json": json.dumps({"notify_roles": ["mentor", "project_manager"], "message": "Task has been marked as Blocked! Immediate assistance may be required."}),
                    "is_active": True,
                },
                {
                    "name": "Auto-Update Project Progress on Issue Done",
                    "trigger_event": "status_changed",
                    "conditions_json": json.dumps({"target_status": "done"}),
                    "actions_json": json.dumps({"recalculate_project_progress": True, "log_activity": True}),
                    "is_active": True,
                },
                {
                    "name": "Notify Reviewer on Deliverable Submission",
                    "trigger_event": "submission_received",
                    "conditions_json": json.dumps({}),
                    "actions_json": json.dumps({"notify_roles": ["faculty_mentor", "reviewer"], "message": "A new project deliverable has been submitted for evaluation."}),
                    "is_active": True,
                },
            ]
            for rule in sample_rules:
                db.add(AutomationRule(**rule))

        # 4. Create sample Epics and Stories if project exists
        project = db.query(Project).first()
        if project:
            epic_count = db.query(Task).filter(Task.project_id == project.id, Task.issue_type == "epic").count()
            if epic_count == 0:
                epic1 = Task(
                    title="Cloud-Native Microservices Architecture & DB Optimization",
                    description="Comprehensive architecture refactoring to enterprise PostgreSQL schema with connection pooling, automated migrations, and read replicas.",
                    issue_key=f"DEV-{1100 + project.id}",
                    issue_type="epic",
                    status="in_progress",
                    priority="high",
                    project_id=project.id,
                    story_points=21,
                    estimated_hours=40.0,
                    actual_hours=24.0,
                    progress_percentage=60,
                    labels="architecture,postgresql,performance",
                )
                epic2 = Task(
                    title="Jira-Style Enterprise Project Management Engine",
                    description="Issue key tracking, epic hierarchy, sprint backlogs, visual burndown curves, and workflow automation.",
                    issue_key=f"DEV-{1200 + project.id}",
                    issue_type="epic",
                    status="in_progress",
                    priority="highest",
                    project_id=project.id,
                    story_points=34,
                    estimated_hours=60.0,
                    actual_hours=30.0,
                    progress_percentage=50,
                    labels="jira,kanban,agile,saas",
                )
                db.add(epic1)
                db.add(epic2)
                db.flush()

                # Attach existing tasks to these epics
                existing_tasks = db.query(Task).filter(Task.project_id == project.id, Task.issue_type == "task").limit(6).all()
                for i, t in enumerate(existing_tasks):
                    t.epic_id = epic1.id if i % 2 == 0 else epic2.id
                    t.story_points = 3 if i % 2 == 0 else 5
                    t.issue_type = "story" if i < 3 else "task"
                    t.labels = "api,backend" if i % 2 == 0 else "ui,frontend"

        db.commit()
        print("Successfully seeded Jira PM templates, workflows, and sample epics/stories!")
    except Exception as e:
        db.rollback()
        print("Error seeding Jira PM:", e)
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_jira_pm()
