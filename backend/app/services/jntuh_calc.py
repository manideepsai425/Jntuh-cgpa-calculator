"""
jntuh_calc.py – JNTUH R22 Academic Computation Engine

Grade Scale (JNTUH R22):
  O   ≥ 90  → 10 grade points   (Outstanding)
  A+  ≥ 80  →  9                (Excellent)
  A   ≥ 70  →  8                (Very Good)
  B+  ≥ 60  →  7                (Good)
  B   ≥ 50  →  6                (Above Average)
  C   ≥ 40  →  5                (Average)
  F   < 40 OR external < 21 →  0  (Fail)

Pass condition (non-mandatory subjects):
  Total (internal + external) ≥ 40  AND  external ≥ 21

Mandatory subjects (MC prefix, credits = 0):
  Graded S (Satisfactory) / U (Unsatisfactory) only.
  Excluded entirely from SGPA / CGPA calculation.

CGPA formula:
  CGPA = Σ (grade_points × credits) across ALL submitted semesters
         ÷ Σ (credits) across ALL submitted semesters

SGPA formula (per semester):
  SGPA = Σ (grade_points × credits) for that semester
         ÷ Σ (credits) for that semester
"""

from typing import Dict, List, Tuple

from app.data.syllabus_r22 import SYLLABUS_R22
from app.models.schemas import (
    CalculateRequest,
    CGPAResult,
    CourseResult,
    SemesterResult,
)

# ── Grade thresholds (descending order – first match wins) ────────────────────
_GRADE_TABLE: List[Tuple[float, str, float]] = [
    (90.0, "O",  10.0),
    (80.0, "A+",  9.0),
    (70.0, "A",   8.0),
    (60.0, "B+",  7.0),
    (50.0, "B",   6.0),
    (40.0, "C",   5.0),
]


def _compute_grade(
    total: float,
    external: float,
    mandatory: bool,
) -> Tuple[str, float, bool]:
    """
    Return (letter_grade, grade_points, passed) for a single course.

    For mandatory (MC) subjects the return is always ("S", 0, True) if
    the student has attempted; the caller can decide whether to mark U.
    """
    if mandatory:
        passed = total >= 40
        return ("S", 0.0, True) if passed else ("U", 0.0, False)

    # Standard pass boundary
    if total < 40.0 or external < 21.0:
        return ("F", 0.0, False)

    for threshold, grade, points in _GRADE_TABLE:
        if total >= threshold:
            return (grade, points, True)

    # Should be unreachable, but defend anyway
    return ("F", 0.0, False)


def _build_syllabus_index() -> Dict[int, Dict]:
    """
    Build fast lookup structures from the raw SYLLABUS_R22 list.

    Returns:
      {
        semester_number: {
          "label": str,
          "courses": { course_code: { name, credits, mandatory } }
        }
      }
    """
    index: Dict[int, Dict] = {}
    for sem_def in SYLLABUS_R22:
        sem_num = sem_def["semester"]
        courses_map: Dict[str, Dict] = {}
        for c in sem_def["courses"]:
            courses_map[c["code"]] = {
                "name":      c["name"],
                "credits":   c["credits"],
                "mandatory": c["mandatory"],
            }
        index[sem_num] = {
            "label":   sem_def["label"],
            "courses": courses_map,
            # Preserve insertion order for transcript display
            "order":   [c["code"] for c in sem_def["courses"]],
        }
    return index


def calculate_cgpa(request: CalculateRequest) -> CGPAResult:
    """
    Main calculation function.

    Processes each submitted semester in order, computes per-course
    grade points, aggregates SGPA per semester, and rolls up the
    cumulative CGPA across all submitted semesters.

    Courses present in the syllabus but absent from the request
    (i.e. student left them blank) are silently skipped so that
    partial-semester submissions work correctly.
    """
    syllabus_index = _build_syllabus_index()

    # Build a quick lookup: semester → { code → CourseMarks }
    input_index: Dict[int, Dict] = {}
    for sem_marks in request.semesters:
        input_index[sem_marks.semester] = {
            cm.code: cm for cm in sem_marks.courses
        }

    semester_results: List[SemesterResult] = []
    cumulative_weighted_gp = 0.0
    cumulative_credit_sum  = 0.0

    # Iterate in syllabus order (1 → 8) but only over submitted semesters
    submitted_sems = sorted(input_index.keys())

    for sem_num in submitted_sems:
        sem_def = syllabus_index.get(sem_num)
        if sem_def is None:
            continue  # Unknown semester – skip gracefully

        course_input_map = input_index[sem_num]
        course_results: List[CourseResult] = []
        sem_weighted_gp = 0.0
        sem_credit_sum  = 0.0
        sem_earned_cr   = 0.0

        # Iterate in official syllabus order
        for code in sem_def["order"]:
            if code not in course_input_map:
                # Student did not submit marks for this course
                continue

            ci       = course_input_map[code]
            cd       = sem_def["courses"][code]
            credits  = cd["credits"]
            mandatory = cd["mandatory"]
            internal = ci.internal_marks
            external = ci.external_marks
            total    = round(internal + external, 2)

            letter, gp, passed = _compute_grade(total, external, mandatory)

            course_results.append(
                CourseResult(
                    code          = code,
                    name          = cd["name"],
                    credits       = credits,
                    internal_marks = internal,
                    external_marks = external,
                    total_marks   = total,
                    letter_grade  = letter,
                    grade_points  = gp,
                    passed        = passed,
                    mandatory     = mandatory,
                )
            )

            # Mandatory subjects: excluded from GPA maths
            if not mandatory and credits > 0:
                sem_credit_sum += credits
                if passed:
                    sem_weighted_gp += gp * credits
                    sem_earned_cr   += credits

        sgpa = (
            round(sem_weighted_gp / sem_credit_sum, 2)
            if sem_credit_sum > 0
            else 0.0
        )

        cumulative_weighted_gp += sem_weighted_gp
        cumulative_credit_sum  += sem_credit_sum

        semester_results.append(
            SemesterResult(
                semester       = sem_num,
                label          = sem_def["label"],
                sgpa           = sgpa,
                total_credits  = round(sem_credit_sum, 2),
                earned_credits = round(sem_earned_cr, 2),
                courses        = course_results,
            )
        )

    cgpa = (
        round(cumulative_weighted_gp / cumulative_credit_sum, 2)
        if cumulative_credit_sum > 0
        else 0.0
    )

    total_earned = round(
        sum(s.earned_credits for s in semester_results), 2
    )

    return CGPAResult(
        cgpa                    = cgpa,
        total_credits_earned    = total_earned,
        total_credits_attempted = round(cumulative_credit_sum, 2),
        semesters               = semester_results,
    )
