from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SubmissionCreate(BaseModel):
    project_id: int
    submission_type: str = "proposal"  # proposal, progress_report, mid_term, final_report, code_repo
    title: str
    description: Optional[str] = None
    repo_url: Optional[str] = None


class EvaluationCreate(BaseModel):
    marks_obtained: float
    max_marks: float = 100.0
    grade: str = "A"
    feedback: Optional[str] = None
    evaluation_criteria_json: Optional[str] = None


class EvaluationResponse(BaseModel):
    id: int
    submission_id: int
    reviewer_id: int
    reviewer_name: Optional[str] = None
    marks_obtained: float
    max_marks: float
    grade: str
    feedback: Optional[str] = None
    evaluation_criteria_json: Optional[str] = None
    evaluated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    enrollment_number: Optional[str] = None
    submission_type: str
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    repo_url: Optional[str] = None
    status: str
    submitted_at: datetime
    evaluations: List[EvaluationResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Aliases for backward compatibility
ProjectEvaluationCreate = EvaluationCreate
ProjectEvaluationResponse = EvaluationResponse
ProjectSubmissionCreate = SubmissionCreate
ProjectSubmissionResponse = SubmissionResponse
