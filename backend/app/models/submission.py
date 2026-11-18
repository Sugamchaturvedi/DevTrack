from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.database import Base


class ProjectSubmission(Base):
    __tablename__ = "project_submissions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_type = Column(String(50), default="proposal", nullable=False)  # proposal, progress_report, mid_term, final_report, code_repo
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(255), nullable=True)
    repo_url = Column(String(255), nullable=True)
    status = Column(String(50), default="submitted", nullable=False)  # submitted, under_review, revision_requested, approved, rejected
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project", back_populates="submissions")
    student = relationship("StudentProfile", back_populates="submissions")
    evaluations = relationship("ProjectEvaluation", back_populates="submission", cascade="all, delete-orphan")


class ProjectEvaluation(Base):
    __tablename__ = "project_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("project_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_obtained = Column(Float, default=0.0, nullable=False)
    max_marks = Column(Float, default=100.0, nullable=False)
    grade = Column(String(10), default="A", nullable=False)
    feedback = Column(Text, nullable=True)
    evaluation_criteria_json = Column(Text, nullable=True)  # JSON string of rubric breakdown
    evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    submission = relationship("ProjectSubmission", back_populates="evaluations")
    reviewer = relationship("User")
