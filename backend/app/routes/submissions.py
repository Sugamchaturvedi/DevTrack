import os
import shutil
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.database.database import get_db
from app.models.project import Project, ProjectMember
from app.models.submission import ProjectSubmission, ProjectEvaluation
from app.models.academic_profiles import StudentProfile
from app.models.system import Notification, ActivityLog
from app.models.user import User, UserRole
from app.schemas.submission import (
    ProjectEvaluationCreate,
    ProjectEvaluationResponse,
    ProjectSubmissionCreate,
    ProjectSubmissionResponse,
)

router = APIRouter(
    tags=["Project Submissions & Evaluations"],
)

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", settings.upload_dir))
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception as e:
    print(f"Submissions upload dir notice: {e}")

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".zip", ".tar.gz", ".pptx", ".txt"}


def _enrich_submission(sub: ProjectSubmission, db: Session) -> dict:
    eval_record = db.query(ProjectEvaluation).filter(ProjectEvaluation.submission_id == sub.id).first()
    student_user = sub.student.user if sub.student and sub.student.user else None
    
    evaluation_data = None
    if eval_record:
        evaluation_data = {
            "id": eval_record.id,
            "submission_id": eval_record.submission_id,
            "reviewer_id": eval_record.reviewer_id,
            "reviewer_name": eval_record.reviewer.name if eval_record.reviewer else "Unknown",
            "marks_obtained": eval_record.marks_obtained,
            "max_marks": eval_record.max_marks,
            "grade": eval_record.grade,
            "feedback": eval_record.feedback,
            "evaluated_at": eval_record.evaluated_at,
        }

    return {
        "id": sub.id,
        "project_id": sub.project_id,
        "project_name": sub.project.name if sub.project else "Unknown",
        "student_id": sub.student_id,
        "student_name": student_user.name if student_user else "Student",
        "student_email": student_user.email if student_user else "",
        "enrollment_number": sub.student.enrollment_number if sub.student else "",
        "submission_type": sub.submission_type,
        "title": sub.title,
        "description": sub.description,
        "file_path": sub.file_path,
        "repo_url": sub.repo_url,
        "status": sub.status,
        "submitted_at": sub.submitted_at,
        "evaluation": evaluation_data,
    }


@router.post(
    "/projects/{project_id}/submissions",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
def create_submission(
    project_id: int,
    title: str = Form(...),
    submission_type: str = Form("proposal"),
    description: Optional[str] = Form(None),
    repo_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get student profile
    student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student_profile:
        # Create student profile on the fly if user is student
        enroll_no = f"STU-{current_user.id:04d}"
        student_profile = StudentProfile(
            user_id=current_user.id,
            enrollment_number=enroll_no,
            department_id=current_user.department_id,
        )
        db.add(student_profile)
        db.commit()
        db.refresh(student_profile)

    saved_file_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}",
            )
        clean_filename = f"sub_{project_id}_{student_profile.id}_{int(datetime.now().timestamp())}_{file.filename}"
        destination = os.path.join(UPLOAD_DIR, clean_filename)
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_file_path = f"/uploads/{clean_filename}"

    submission = ProjectSubmission(
        project_id=project_id,
        student_id=student_profile.id,
        submission_type=submission_type,
        title=title,
        description=description,
        file_path=saved_file_path,
        repo_url=repo_url,
        status="submitted",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Activity log
    log = ActivityLog(
        user_id=current_user.id,
        entity_type="submission",
        entity_id=submission.id,
        action="submitted",
        details=f"Submitted deliverable '{title}' for project '{project.name}'",
    )
    db.add(log)

    # Notify faculty mentor if assigned
    if project.faculty_mentor_id:
        notif = Notification(
            user_id=project.faculty_mentor_id,
            title="New Project Submission",
            message=f"{current_user.name} submitted '{title}' for project '{project.name}'.",
            notification_type="submission",
            reference_link=f"/projects/{project_id}",
        )
        db.add(notif)

    db.commit()
    return _enrich_submission(submission, db)


@router.get(
    "/projects/{project_id}/submissions",
    response_model=List[dict],
)
def list_project_submissions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    submissions = (
        db.query(ProjectSubmission)
        .filter(ProjectSubmission.project_id == project_id)
        .order_by(ProjectSubmission.submitted_at.desc())
        .all()
    )
    return [_enrich_submission(s, db) for s in submissions]


@router.get(
    "/submissions/pending",
    response_model=List[dict],
)
def list_pending_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ProjectSubmission).filter(ProjectSubmission.status.in_(["submitted", "under_review"]))

    # If faculty, filter by projects they mentor or supervise
    if current_user.role == UserRole.FACULTY.value:
        query = query.join(Project).filter(
            (Project.faculty_mentor_id == current_user.id) | (Project.owner_id == current_user.id)
        )
    elif current_user.role == UserRole.STUDENT.value:
        # Students see their own pending submissions
        student_prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if student_prof:
            query = query.filter(ProjectSubmission.student_id == student_prof.id)
        else:
            return []

    submissions = query.order_by(ProjectSubmission.submitted_at.desc()).all()
    return [_enrich_submission(s, db) for s in submissions]


@router.get(
    "/submissions/{submission_id}",
    response_model=dict,
)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = db.query(ProjectSubmission).filter(ProjectSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return _enrich_submission(sub, db)


@router.post(
    "/submissions/{submission_id}/evaluate",
    response_model=dict,
)
def evaluate_submission(
    submission_id: int,
    eval_in: ProjectEvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([
            UserRole.SUPER_ADMIN.value,
            UserRole.UNIVERSITY_ADMIN.value,
            UserRole.HOD.value,
            UserRole.FACULTY.value,
            UserRole.REVIEWER.value,
        ])
    ),
):
    submission = db.query(ProjectSubmission).filter(ProjectSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Check if already evaluated
    evaluation = db.query(ProjectEvaluation).filter(ProjectEvaluation.submission_id == submission_id).first()
    if evaluation:
        evaluation.marks_obtained = eval_in.marks_obtained
        evaluation.max_marks = eval_in.max_marks
        evaluation.grade = eval_in.grade
        evaluation.feedback = eval_in.feedback
        evaluation.evaluation_criteria_json = eval_in.evaluation_criteria_json
        evaluation.reviewer_id = current_user.id
        evaluation.evaluated_at = datetime.now(timezone.utc)
    else:
        evaluation = ProjectEvaluation(
            submission_id=submission_id,
            reviewer_id=current_user.id,
            marks_obtained=eval_in.marks_obtained,
            max_marks=eval_in.max_marks,
            grade=eval_in.grade,
            feedback=eval_in.feedback,
            evaluation_criteria_json=eval_in.evaluation_criteria_json,
            evaluated_at=datetime.now(timezone.utc),
        )
        db.add(evaluation)

    submission.status = "evaluated" if eval_in.marks_obtained >= (eval_in.max_marks * 0.4) else "revision_requested"
    db.commit()

    # Notify student
    student_user = submission.student.user if submission.student else None
    if student_user:
        notif = Notification(
            user_id=student_user.id,
            title="Project Submission Evaluated",
            message=f"Your submission '{submission.title}' received Grade '{eval_in.grade}' ({eval_in.marks_obtained}/{eval_in.max_marks}) with feedback.",
            notification_type="evaluation",
            reference_link=f"/projects/{submission.project_id}",
        )
        db.add(notif)

    # Activity log
    log = ActivityLog(
        user_id=current_user.id,
        entity_type="evaluation",
        entity_id=evaluation.id,
        action="evaluated",
        details=f"Evaluated submission '{submission.title}' with Grade {eval_in.grade}",
    )
    db.add(log)
    db.commit()

    return _enrich_submission(submission, db)
