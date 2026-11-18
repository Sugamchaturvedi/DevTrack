from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.dependencies import get_current_user, require_roles
from app.database.database import get_db
from app.models.academic_profiles import FacultyProfile, StudentProfile
from app.models.agile import Sprint
from app.models.project import Project, ProjectMember
from app.models.submission import ProjectEvaluation, ProjectSubmission
from app.models.system import ActivityLog, Notification
from app.models.task import Task
from app.models.university import Department, Program, School
from app.models.user import User, UserRole

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics & Dashboards"],
)


@router.get(
    "/dashboard",
    response_model=dict,
)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role

    # 1. Super Admin & University Admin Dashboard
    if role in [UserRole.SUPER_ADMIN.value, UserRole.UNIVERSITY_ADMIN.value]:
        total_users = db.query(User).count()
        total_students = db.query(User).filter(User.role.in_([UserRole.STUDENT.value, UserRole.TEAM_LEADER.value])).count()
        total_faculty = db.query(User).filter(User.role.in_([UserRole.FACULTY.value, UserRole.HOD.value, UserRole.REVIEWER.value])).count()
        total_depts = db.query(Department).count()
        total_programs = db.query(Program).count()
        total_projects = db.query(Project).count()
        active_projects = db.query(Project).filter(Project.status.in_(["active", "In Progress", "Planning"])).count()
        completed_projects = db.query(Project).filter(Project.status.in_(["completed", "Completed"])).count()
        total_tasks = db.query(Task).count()
        completed_tasks = db.query(Task).filter(Task.status.in_(["completed", "Done"])).count()
        pending_reviews = db.query(ProjectSubmission).filter(ProjectSubmission.status.in_(["submitted", "under_review"])).count()

        # Status distribution
        status_counts = db.query(Project.status, func.count(Project.id)).group_by(Project.status).all()
        status_dist = {str(s or "active").lower(): c for s, c in status_counts}

        # Category distribution
        cat_counts = db.query(Project.category, func.count(Project.id)).group_by(Project.category).all()
        cat_dist = {str(cat or "Other"): c for cat, c in cat_counts}

        # Recent activities
        recent_logs = (
            db.query(ActivityLog)
            .order_by(ActivityLog.timestamp.desc())
            .limit(10)
            .all()
        )
        activities = [
            {
                "id": l.id,
                "user_name": l.user.name if l.user else "System",
                "entity_type": l.entity_type,
                "action": l.action,
                "details": l.details,
                "timestamp": l.timestamp,
            }
            for l in recent_logs
        ]

        return {
            "role": role,
            "metrics": {
                "total_users": total_users,
                "total_students": total_students,
                "total_faculty": total_faculty,
                "total_departments": total_depts,
                "total_programs": total_programs,
                "total_projects": total_projects,
                "active_projects": active_projects,
                "completed_projects": completed_projects,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "pending_reviews": pending_reviews,
            },
            "charts": {
                "status_distribution": status_dist,
                "category_distribution": cat_dist,
            },
            "recent_activity": activities,
        }

    # 2. HOD Dashboard
    elif role == UserRole.HOD.value:
        dept_id = current_user.department_id
        dept_projects = db.query(Project).filter(Project.department_id == dept_id)
        total_projects = dept_projects.count()
        active_projects = dept_projects.filter(Project.status.in_(["active", "In Progress", "Planning"])).count()
        completed_projects = dept_projects.filter(Project.status.in_(["completed", "Completed"])).count()

        dept_students = db.query(User).filter(User.department_id == dept_id, User.role == UserRole.STUDENT.value).count()
        dept_faculty = db.query(User).filter(User.department_id == dept_id, User.role == UserRole.FACULTY.value).count()

        pending_evaluations = (
            db.query(ProjectSubmission)
            .join(Project)
            .filter(Project.department_id == dept_id, ProjectSubmission.status.in_(["submitted", "under_review"]))
            .count()
        )

        return {
            "role": role,
            "department_id": dept_id,
            "department_name": current_user.department.name if current_user.department else "Department",
            "metrics": {
                "total_projects": total_projects,
                "active_projects": active_projects,
                "completed_projects": completed_projects,
                "student_count": dept_students,
                "faculty_count": dept_faculty,
                "pending_evaluations": pending_evaluations,
                "completion_rate": int((completed_projects / max(total_projects, 1)) * 100),
            },
        }

    # 3. Faculty & Reviewer Dashboard
    elif role in [UserRole.FACULTY.value, UserRole.REVIEWER.value]:
        dept_id = current_user.department_id
        if dept_id:
            assigned_projects = (
                db.query(Project)
                .filter(
                    (Project.faculty_mentor_id == current_user.id)
                    | (Project.owner_id == current_user.id)
                    | (Project.department_id == dept_id)
                )
                .all()
            )
        else:
            assigned_projects = (
                db.query(Project)
                .filter((Project.faculty_mentor_id == current_user.id) | (Project.owner_id == current_user.id))
                .all()
            )
        project_ids = [p.id for p in assigned_projects]

        pending_submissions = (
            db.query(ProjectSubmission)
            .filter(ProjectSubmission.project_id.in_(project_ids), ProjectSubmission.status.in_(["submitted", "under_review"]))
            .count()
        )

        total_tasks = db.query(Task).filter(Task.project_id.in_(project_ids)).count() if project_ids else 0
        completed_tasks = db.query(Task).filter(Task.project_id.in_(project_ids), Task.status.in_(["completed", "Done"])).count() if project_ids else 0

        return {
            "role": role,
            "metrics": {
                "assigned_projects_count": len(assigned_projects),
                "supervised_teams_count": len(assigned_projects),
                "pending_submissions": pending_submissions,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
            },
            "assigned_projects": [
                {
                    "id": p.id,
                    "name": p.name,
                    "code": p.code,
                    "status": p.status,
                    "completion_percentage": p.completion_percentage,
                    "deadline": p.deadline,
                }
                for p in assigned_projects[:10]
            ],
        }

    # 4. Student & Team Leader Dashboard
    else:
        # Projects where user is owner or member
        owned_projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
        member_project_ids = [
            m.project_id for m in db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
        ]
        all_my_projects = {p.id: p for p in owned_projects}
        if member_project_ids:
            for p in db.query(Project).filter(Project.id.in_(member_project_ids)).all():
                all_my_projects[p.id] = p

        my_tasks = db.query(Task).filter(Task.assigned_to_id == current_user.id).all()
        total_my_tasks = len(my_tasks)
        completed_my_tasks = sum(1 for t in my_tasks if t.status in ["completed", "Done"])
        pending_my_tasks = total_my_tasks - completed_my_tasks

        # Recent feedback / evaluations
        student_prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        recent_evals = []
        if student_prof:
            eval_query = (
                db.query(ProjectEvaluation)
                .join(ProjectSubmission)
                .filter(ProjectSubmission.student_id == student_prof.id)
                .order_by(ProjectEvaluation.evaluated_at.desc())
                .limit(5)
                .all()
            )
            for ev in eval_query:
                recent_evals.append({
                    "id": ev.id,
                    "submission_title": ev.submission.title if ev.submission else "Submission",
                    "grade": ev.grade,
                    "marks_obtained": ev.marks_obtained,
                    "max_marks": ev.max_marks,
                    "feedback": ev.feedback,
                    "reviewer_name": ev.reviewer.name if ev.reviewer else "Faculty",
                })

        return {
            "role": role,
            "metrics": {
                "my_projects_count": len(all_my_projects),
                "my_tasks_count": total_my_tasks,
                "completed_tasks": completed_my_tasks,
                "pending_tasks": pending_my_tasks,
                "evaluations_count": len(recent_evals),
            },
            "my_projects": [
                {
                    "id": p.id,
                    "name": p.name,
                    "status": p.status,
                    "priority": p.priority,
                    "completion_percentage": p.completion_percentage,
                    "deadline": p.deadline,
                }
                for p in all_my_projects.values()
            ],
            "my_tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                    "priority": t.priority,
                    "due_date": t.due_date,
                    "project_id": t.project_id,
                }
                for t in my_tasks[:10]
            ],
            "recent_feedback": recent_evals,
        }
