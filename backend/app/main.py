"""
main.py – JNTUH R22 CGPA Calculator · FastAPI Application

Render deployment start command:
  uvicorn app.main:app --host 0.0.0.0 --port $PORT

Environment variables (optional):
  ALLOWED_ORIGINS  – comma-separated list of allowed frontend origins.
                     Defaults to "*" for development convenience.
                     In production set this to your Vercel deployment URL,
                     e.g. "https://your-app.vercel.app"
"""

import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.data.syllabus_r22 import SYLLABUS_R22
from app.models.schemas import CalculateRequest, CGPAResult
from app.services.jntuh_calc import calculate_cgpa

# ── Application factory ────────────────────────────────────────────────────────

app = FastAPI(
    title       = "JNTUH R22 CGPA Calculator API",
    description = (
        "Production-grade backend for computing SGPA and CGPA "
        "for JNTUH R22 B.Tech CSE (AI & ML) – all 8 semesters."
    ),
    version     = "1.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────

_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
_origins = (
    ["*"]
    if _raw_origins.strip() == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = _origins,
    allow_credentials = False,   # must be False when allow_origins=["*"]
    allow_methods     = ["GET", "POST", "OPTIONS"],
    allow_headers     = ["*"],
)

# ── Health / root ──────────────────────────────────────────────────────────────

@app.get(
    "/",
    summary = "Health check",
    tags    = ["meta"],
)
def root() -> dict:
    """Simple liveness probe. Render pings this to confirm the service is up."""
    return {
        "status":  "live",
        "service": "JNTUH R22 CGPA Calculator",
        "version": "1.0.0",
    }


# ── Syllabus endpoint ──────────────────────────────────────────────────────────

@app.get(
    "/syllabus",
    summary = "Fetch full 8-semester syllabus structure",
    tags    = ["syllabus"],
)
def get_syllabus() -> dict:
    """
    Returns the complete JNTUH R22 CSE (AI & ML) course structure
    for all 8 semesters. The frontend calls this on mount to
    dynamically build the marks-entry form.
    """
    return {"syllabus": SYLLABUS_R22}


# ── Calculation endpoint ───────────────────────────────────────────────────────

@app.post(
    "/calculate",
    response_model = CGPAResult,
    summary        = "Compute SGPA per semester and overall CGPA",
    tags           = ["calculation"],
    status_code    = status.HTTP_200_OK,
)
def calculate(request: CalculateRequest) -> CGPAResult:
    """
    Accepts a JSON payload of submitted semester marks and returns
    full JNTUH R22-compliant SGPA / CGPA computation.

    **Payload shape:**
    ```json
    {
      "semesters": [
        {
          "semester": 1,
          "courses": [
            { "code": "MA101BS", "internal_marks": 35, "external_marks": 55 }
          ]
        }
      ]
    }
    ```

    **Pass condition:** Total ≥ 40 AND External ≥ 21 (non-mandatory subjects).
    Mandatory (MC) subjects are graded S/U and excluded from GPA maths.
    """
    if not request.semesters:
        raise HTTPException(
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail      = "At least one semester with course marks must be provided.",
        )

    try:
        return calculate_cgpa(request)
    except ValueError as exc:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = str(exc),
        ) from exc
    except Exception as exc:                        # pragma: no cover
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail      = f"Internal computation error: {exc}",
        ) from exc
