from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.database import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    enrollment_number = Column(String(50), unique=True, index=True, nullable=False)
    program_id = Column(Integer, ForeignKey("programs.id", ondelete="SET NULL"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)
    batch_year = Column(Integer, nullable=True)
    cgpa = Column(Float, default=0.0, nullable=False)
    academic_status = Column(String(50), default="active", nullable=False)  # active, graduated, suspended
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="student_profile")
    program = relationship("Program")
    department = relationship("Department")
    semester = relationship("Semester")
    section = relationship("Section", back_populates="students")
    submissions = relationship("ProjectSubmission", back_populates="student", cascade="all, delete-orphan")


class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    designation = Column(String(100), default="Assistant Professor", nullable=False)
    specialization = Column(String(200), nullable=True)
    max_project_load = Column(Integer, default=5, nullable=False)
    current_project_load = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="faculty_profile")
    department = relationship("Department")
