"""
Pydantic v2 schemas for the JNTUH R22 CGPA Calculator API.

Request  → CalculateRequest  (marks payload from frontend)
Response → CGPAResult        (structured result payload)
"""

from pydantic import BaseModel, Field
from typing import List


# ── Request schemas ────────────────────────────────────────────────────────────

class CourseMarks(BaseModel):
    """Marks submitted for a single course."""

    code: str = Field(..., description="Official course code, e.g. MA101BS")
    internal_marks: float = Field(..., ge=0, le=40, description="Internal marks out of 40")
    external_marks: float = Field(..., ge=0, le=60, description="External marks out of 60")


class SemesterMarks(BaseModel):
    """All course marks submitted for one semester."""

    semester: int = Field(..., ge=1, le=8, description="Semester number (1–8)")
    courses: List[CourseMarks]


class CalculateRequest(BaseModel):
    """Top-level request body sent from the frontend."""

    semesters: List[SemesterMarks]


# ── Response schemas ───────────────────────────────────────────────────────────

class CourseResult(BaseModel):
    """Computed result for a single course."""

    code: str
    name: str
    credits: float
    internal_marks: float
    external_marks: float
    total_marks: float
    letter_grade: str
    grade_points: float
    passed: bool
    mandatory: bool


class SemesterResult(BaseModel):
    """Aggregated result for one semester."""

    semester: int
    label: str
    sgpa: float
    total_credits: float
    earned_credits: float
    courses: List[CourseResult]


class CGPAResult(BaseModel):
    """Final top-level CGPA computation result."""

    cgpa: float
    total_credits_earned: float
    total_credits_attempted: float
    semesters: List[SemesterResult]
