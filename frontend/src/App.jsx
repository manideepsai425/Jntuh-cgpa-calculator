// ─────────────────────────────────────────────────────────────────────────────
//  App.jsx — JNTUH R22 CGPA Calculator · Complete React Dashboard
//
//  Architecture:
//    Mount  → GET  /syllabus   → build dynamic mark-entry form
//    Submit → POST /calculate  → render analytics dashboard
//
//  Set VITE_API_URL in your Vercel environment variables to point to your
//  Render backend URL, e.g.:  VITE_API_URL=https://your-api.onrender.com
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ChevronDown,
  ChevronUp,
  Calculator,
  Award,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Zap,
  GraduationCap,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from "lucide-react";

// ── API base URL (set VITE_API_URL in Vercel env) ─────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ── JNTUH R22 grade metadata for colour-coded display ─────────────────────────
const GRADE_META = {
  O:   { color: "#00E5FF", bg: "rgba(0,229,255,0.12)",   label: "Outstanding"    },
  "A+":{ color: "#00FF88", bg: "rgba(0,255,136,0.12)",   label: "Excellent"      },
  A:   { color: "#88FF44", bg: "rgba(136,255,68,0.12)",  label: "Very Good"      },
  "B+":{ color: "#FFD700", bg: "rgba(255,215,0,0.12)",   label: "Good"           },
  B:   { color: "#FF9500", bg: "rgba(255,149,0,0.12)",   label: "Above Average"  },
  C:   { color: "#FF6B35", bg: "rgba(255,107,53,0.12)",  label: "Average"        },
  F:   { color: "#FF3B30", bg: "rgba(255,59,48,0.12)",   label: "Fail"           },
  S:   { color: "#00E5FF", bg: "rgba(0,229,255,0.10)",   label: "Satisfactory"   },
  U:   { color: "#FF3B30", bg: "rgba(255,59,48,0.10)",   label: "Unsatisfactory" },
  "–": { color: "#475569", bg: "transparent",            label: "Not entered"    },
};

// ── Bar colours based on SGPA band ────────────────────────────────────────────
function barColor(sgpa) {
  if (sgpa >= 9)  return "#00E5FF";
  if (sgpa >= 7)  return "#B345F1";
  if (sgpa >= 5)  return "#FF9500";
  return "#FF3B30";
}

// ── Live grade preview (mirrors backend logic exactly) ────────────────────────
function liveGrade(internal, external, mandatory) {
  const i = parseFloat(internal);
  const e = parseFloat(external);
  if (isNaN(i) || isNaN(e) || (internal === "" && external === "")) return "–";
  const t = (isNaN(i) ? 0 : i) + (isNaN(e) ? 0 : e);
  const extVal = isNaN(e) ? 0 : e;

  if (mandatory) return t >= 40 ? "S" : "U";
  if (t < 40 || extVal < 21) return "F";
  if (t >= 90) return "O";
  if (t >= 80) return "A+";
  if (t >= 70) return "A";
  if (t >= 60) return "B+";
  if (t >= 50) return "B";
  return "C";
}

// ── Recharts custom tooltip ────────────────────────────────────────────────────
function SGPATooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "rgba(5,8,18,0.96)",
        border: "1px solid rgba(0,229,255,0.25)",
        borderRadius: 10,
        padding: "10px 16px",
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 4 }}>
        {d.fullLabel}
      </p>
      <p style={{ color: barColor(d.sgpa), fontWeight: 700, fontSize: 20 }}>
        {Number(d.sgpa).toFixed(2)}
      </p>
      <p style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>SGPA</p>
    </div>
  );
}

// ── Reusable summary stat card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent, sub, wide }) {
  return (
    <div
      className={`rounded-2xl p-5 relative overflow-hidden${wide ? " col-span-2" : ""}`}
      style={{
        background: wide
          ? `linear-gradient(135deg, rgba(0,229,255,0.07), rgba(179,69,241,0.07))`
          : "rgba(255,255,255,0.03)",
        border: wide
          ? "1px solid rgba(0,229,255,0.18)"
          : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {wide && (
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,229,255,0.12), transparent 70%)",
            transform: "translate(35%,-35%)",
          }}
        />
      )}
      <Icon size={18} style={{ color: accent, marginBottom: 10 }} />
      <p
        style={{
          color: "#64748B",
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "0.08em",
          marginBottom: 4,
        }}
      >
        {label}
      </p>
      <p
        className={wide ? "gradient-text font-syne font-extrabold" : "font-syne font-bold text-white"}
        style={{ fontSize: wide ? "clamp(2.4rem,5vw,3.6rem)" : 28, lineHeight: 1 }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            color: "#475569",
            fontSize: 11,
            fontFamily: "JetBrains Mono, monospace",
            marginTop: 6,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Divider row between transcript entries ─────────────────────────────────────
const ROW_BORDER = "border-b border-white/[0.04]";

// ─────────────────────────────────────────────────────────────────────────────
//  Main Application Component
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [syllabus,    setSyllabus]    = useState([]);
  const [marks,       setMarks]       = useState({});
  const [expanded,    setExpanded]    = useState({});
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [fetchError,  setFetchError]  = useState("");
  const [calcError,   setCalcError]   = useState("");

  const resultsRef = useRef(null);

  // ── Fetch full syllabus on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/syllabus`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(({ syllabus: syl }) => {
        setSyllabus(syl);

        // Initialise marks state with empty strings
        const initMarks    = {};
        const initExpanded = {};
        syl.forEach((sem, idx) => {
          initMarks[sem.semester]    = {};
          initExpanded[sem.semester] = idx === 0; // open first semester by default
          sem.courses.forEach((c) => {
            initMarks[sem.semester][c.code] = { internal: "", external: "" };
          });
        });
        setMarks(initMarks);
        setExpanded(initExpanded);
      })
      .catch((err) =>
        setFetchError(
          `Cannot reach backend (${err.message}). ` +
          `Ensure the Render service is running and VITE_API_URL is set correctly.`
        )
      )
      .finally(() => setLoading(false));
  }, []);

  // ── Toggle semester accordion ────────────────────────────────────────────────
  function toggleSem(semNum) {
    setExpanded((prev) => ({ ...prev, [semNum]: !prev[semNum] }));
  }

  // ── Handle mark input change (clamps to valid range) ─────────────────────────
  function onMark(semNum, code, field, raw) {
    const max = field === "internal" ? 40 : 60;
    let value = raw;
    if (raw !== "") {
      const n = parseFloat(raw);
      if (!isNaN(n)) value = String(Math.min(Math.max(0, n), max));
    }
    setMarks((prev) => ({
      ...prev,
      [semNum]: {
        ...prev[semNum],
        [code]: { ...prev[semNum]?.[code], [field]: value },
      },
    }));
  }

  // ── Reset everything ─────────────────────────────────────────────────────────
  function handleReset() {
    const blankMarks = {};
    syllabus.forEach((sem) => {
      blankMarks[sem.semester] = {};
      sem.courses.forEach((c) => {
        blankMarks[sem.semester][c.code] = { internal: "", external: "" };
      });
    });
    setMarks(blankMarks);
    setResult(null);
    setCalcError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Submit marks to backend ──────────────────────────────────────────────────
  async function handleCalculate() {
    setCalcError("");

    // Build minimal payload — only include courses where both fields are filled
    const semesters = [];
    syllabus.forEach((sem) => {
      const courses = [];
      sem.courses.forEach((c) => {
        const m = marks[sem.semester]?.[c.code];
        if (m?.internal !== "" && m?.external !== "") {
          courses.push({
            code:           c.code,
            internal_marks: parseFloat(m.internal) || 0,
            external_marks: parseFloat(m.external) || 0,
          });
        }
      });
      if (courses.length > 0) {
        semesters.push({ semester: sem.semester, courses });
      }
    });

    if (semesters.length === 0) {
      setCalcError(
        "Enter marks for at least one course (both internal and external) before calculating."
      );
      return;
    }

    setCalculating(true);
    try {
      const res = await fetch(`${API_BASE}/calculate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ semesters }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setResult(data);

      // ── Auto-scroll to analytics dashboard ──────────────────────────────────
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      setCalcError(e.message || "An unexpected error occurred. Please try again.");
    } finally {
      setCalculating(false);
    }
  }

  // ── Count filled courses for a semester (for header badge) ───────────────────
  function filledCount(sem) {
    return sem.courses.filter((c) => {
      const m = marks[sem.semester]?.[c.code];
      return m?.internal !== "" && m?.external !== "";
    }).length;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#050812" }}>

      {/* ── Decorative background ─────────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 15% 15%, rgba(179,69,241,0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, rgba(0,229,255,0.05) 0%, transparent 55%)`,
        }}
      />
      {/* Subtle grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
        }}
      />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-24">

        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <header className="text-center mb-14 animate-fade-up">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
            style={{
              background: "rgba(0,229,255,0.07)",
              border: "1px solid rgba(0,229,255,0.18)",
            }}
          >
            <Zap size={13} style={{ color: "#00E5FF" }} />
            <span
              style={{
                color: "#00E5FF",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                letterSpacing: "0.06em",
              }}
            >
              JNTUH R22 · B.Tech CSE (AI &amp; ML)
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-syne font-extrabold text-white mb-4"
            style={{
              fontSize: "clamp(2rem, 6vw, 3.8rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Academic{" "}
            <span className="gradient-text">CGPA Calculator</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              color: "#64748B",
              fontSize: 15,
              maxWidth: 540,
              margin: "0 auto",
              lineHeight: 1.65,
            }}
          >
            Enter internal &amp; external marks for all 8 semesters.
            The engine computes your SGPA per semester and cumulative CGPA
            per official JNTUH R22 grading regulations.
          </p>
        </header>

        {/* ══ LOADING STATE ═════════════════════════════════════════════════ */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-24">
            <Loader2
              size={28}
              className="animate-spin"
              style={{ color: "#00E5FF" }}
            />
            <p
              style={{
                color: "#475569",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
              }}
            >
              Fetching syllabus from backend…
            </p>
          </div>
        )}

        {/* ══ FETCH ERROR ════════════════════════════════════════════════════ */}
        {!loading && fetchError && (
          <div
            className="rounded-2xl p-5 flex items-start gap-3 mb-8"
            style={{
              background: "rgba(255,59,48,0.07)",
              border: "1px solid rgba(255,59,48,0.22)",
            }}
          >
            <AlertTriangle
              size={18}
              style={{ color: "#FF3B30", flexShrink: 0, marginTop: 2 }}
            />
            <p style={{ color: "#FF6B6B", fontSize: 14, lineHeight: 1.6 }}>
              {fetchError}
            </p>
          </div>
        )}

        {/* ══ SEMESTER ACCORDIONS ════════════════════════════════════════════ */}
        {!loading && syllabus.length > 0 && (
          <div className="space-y-3">
            {syllabus.map((sem) => {
              const isOpen = !!expanded[sem.semester];
              const filled  = filledCount(sem);
              const total   = sem.courses.length;

              return (
                <div
                  key={sem.semester}
                  className="rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: isOpen
                      ? "1px solid rgba(0,229,255,0.14)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* ── Accordion header ──────────────────────────────────── */}
                  <button
                    onClick={() => toggleSem(sem.semester)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-4">
                      {/* Semester pill */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isOpen
                            ? "linear-gradient(135deg, rgba(0,229,255,0.18), rgba(179,69,241,0.18))"
                            : "rgba(255,255,255,0.05)",
                          border: isOpen
                            ? "1px solid rgba(0,229,255,0.25)"
                            : "1px solid rgba(255,255,255,0.08)",
                          color: isOpen ? "#00E5FF" : "#64748B",
                          fontFamily: "JetBrains Mono, monospace",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        S{sem.semester}
                      </div>

                      {/* Label & fill status */}
                      <div>
                        <p
                          className="font-syne font-semibold"
                          style={{
                            color: isOpen ? "#E2E8F0" : "#94A3B8",
                            fontSize: 14,
                          }}
                        >
                          {sem.label}
                        </p>
                        <p
                          style={{
                            color: "#475569",
                            fontSize: 11,
                            fontFamily: "JetBrains Mono, monospace",
                            marginTop: 1,
                          }}
                        >
                          {total} courses ·{" "}
                          <span
                            style={{
                              color: filled === total ? "#00FF88" : "#64748B",
                            }}
                          >
                            {filled}/{total} filled
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {filled === total && (
                        <CheckCircle2
                          size={15}
                          style={{ color: "#00FF88" }}
                        />
                      )}
                      {isOpen ? (
                        <ChevronUp
                          size={18}
                          style={{ color: "#475569" }}
                        />
                      ) : (
                        <ChevronDown
                          size={18}
                          style={{ color: "#475569" }}
                        />
                      )}
                    </div>
                  </button>

                  {/* ── Accordion body ────────────────────────────────────── */}
                  {isOpen && (
                    <div className="px-3 pb-4">
                      {/* Column header row */}
                      <div
                        className="hidden sm:grid items-center px-3 py-2 mb-1"
                        style={{
                          gridTemplateColumns: "1fr 108px 48px 110px 110px 58px",
                          gap: "8px",
                          color: "#334155",
                          fontSize: 10,
                          fontFamily: "JetBrains Mono, monospace",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        <span>Course</span>
                        <span className="text-center">Code</span>
                        <span className="text-center">Cr</span>
                        <span className="text-center">Internal /40</span>
                        <span className="text-center">External /60</span>
                        <span className="text-center">Grade</span>
                      </div>

                      {/* Course rows */}
                      {sem.courses.map((course) => {
                        const m =
                          marks[sem.semester]?.[course.code] || {
                            internal: "",
                            external: "",
                          };
                        const grade = liveGrade(
                          m.internal,
                          m.external,
                          course.mandatory
                        );
                        const gm = GRADE_META[grade] || GRADE_META["–"];

                        return (
                          <div
                            key={course.code}
                            className="rounded-xl mb-1.5 transition-colors hover:bg-white/[0.015]"
                          >
                            {/* Desktop layout */}
                            <div
                              className="hidden sm:grid items-center px-3 py-3"
                              style={{
                                gridTemplateColumns:
                                  "1fr 108px 48px 110px 110px 58px",
                                gap: "8px",
                              }}
                            >
                              {/* Name */}
                              <div className="min-w-0 pr-2">
                                <p
                                  style={{
                                    color: "#CBD5E1",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {course.name}
                                </p>
                                {course.mandatory && (
                                  <span
                                    className="inline-block mt-0.5 px-1.5 py-px rounded text-xs"
                                    style={{
                                      background: "rgba(255,149,0,0.1)",
                                      color: "#FF9500",
                                      fontFamily:
                                        "JetBrains Mono, monospace",
                                      fontSize: 10,
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    MC · S/U Basis
                                  </span>
                                )}
                              </div>

                              {/* Code */}
                              <div className="text-center">
                                <span
                                  style={{
                                    color: "#475569",
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                    fontSize: 11,
                                  }}
                                >
                                  {course.code}
                                </span>
                              </div>

                              {/* Credits */}
                              <div className="text-center">
                                <span
                                  style={{
                                    color:
                                      course.credits === 0
                                        ? "#334155"
                                        : "#64748B",
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                    fontSize: 13,
                                    fontWeight: 600,
                                  }}
                                >
                                  {course.credits}
                                </span>
                              </div>

                              {/* Internal input */}
                              <div className="flex justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  step="0.5"
                                  value={m.internal}
                                  onChange={(e) =>
                                    onMark(
                                      sem.semester,
                                      course.code,
                                      "internal",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0 – 40"
                                  className="mark-input w-[88px] text-center rounded-lg py-2 text-sm transition-all"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border:
                                      "1px solid rgba(255,255,255,0.08)",
                                    color: "#E2E8F0",
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                    outline: "none",
                                  }}
                                />
                              </div>

                              {/* External input */}
                              <div className="flex justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  step="0.5"
                                  value={m.external}
                                  onChange={(e) =>
                                    onMark(
                                      sem.semester,
                                      course.code,
                                      "external",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0 – 60"
                                  className="mark-input w-[88px] text-center rounded-lg py-2 text-sm transition-all"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border:
                                      "1px solid rgba(255,255,255,0.08)",
                                    color: "#E2E8F0",
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                    outline: "none",
                                  }}
                                />
                              </div>

                              {/* Live grade badge */}
                              <div className="flex justify-center">
                                <span
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                                  style={{
                                    background: gm.bg,
                                    color: gm.color,
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                    minWidth: 38,
                                    textAlign: "center",
                                  }}
                                >
                                  {grade}
                                </span>
                              </div>
                            </div>

                            {/* Mobile layout (stacked) */}
                            <div className="sm:hidden p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p
                                    style={{
                                      color: "#CBD5E1",
                                      fontSize: 13,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {course.name}
                                  </p>
                                  <p
                                    style={{
                                      color: "#475569",
                                      fontFamily:
                                        "JetBrains Mono, monospace",
                                      fontSize: 11,
                                      marginTop: 2,
                                    }}
                                  >
                                    {course.code} · {course.credits} cr
                                    {course.mandatory && " · MC"}
                                  </p>
                                </div>
                                <span
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold"
                                  style={{
                                    background: gm.bg,
                                    color: gm.color,
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                  }}
                                >
                                  {grade}
                                </span>
                              </div>
                              <div className="flex gap-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  step="0.5"
                                  value={m.internal}
                                  onChange={(e) =>
                                    onMark(
                                      sem.semester,
                                      course.code,
                                      "internal",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Internal /40"
                                  className="mark-input flex-1 text-center rounded-lg py-2 text-sm"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border:
                                      "1px solid rgba(255,255,255,0.08)",
                                    color: "#E2E8F0",
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                    outline: "none",
                                  }}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  step="0.5"
                                  value={m.external}
                                  onChange={(e) =>
                                    onMark(
                                      sem.semester,
                                      course.code,
                                      "external",
                                      e.target.value
                                    )
                                  }
                                  placeholder="External /60"
                                  className="mark-input flex-1 text-center rounded-lg py-2 text-sm"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border:
                                      "1px solid rgba(255,255,255,0.08)",
                                    color: "#E2E8F0",
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                    outline: "none",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ ACTION BUTTONS ════════════════════════════════════════════════ */}
        {!loading && syllabus.length > 0 && (
          <div className="mt-10 flex flex-col items-center gap-4">
            {calcError && (
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{
                  background: "rgba(255,107,53,0.08)",
                  border: "1px solid rgba(255,107,53,0.2)",
                }}
              >
                <AlertTriangle size={14} style={{ color: "#FF6B35" }} />
                <p
                  style={{
                    color: "#FF6B35",
                    fontSize: 13,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {calcError}
                </p>
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Calculate CTA */}
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl font-syne font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-pulse_glow"
                style={{
                  background: calculating
                    ? "rgba(0,229,255,0.07)"
                    : "linear-gradient(135deg, #00E5FF 0%, #B345F1 100%)",
                  color: calculating ? "#00E5FF" : "#050812",
                  border: calculating
                    ? "1px solid rgba(0,229,255,0.3)"
                    : "none",
                  letterSpacing: "0.02em",
                  boxShadow: calculating
                    ? "none"
                    : "0 0 40px rgba(0,229,255,0.28), 0 0 80px rgba(179,69,241,0.14)",
                  animationPlayState: calculating ? "paused" : "running",
                }}
              >
                {calculating ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                      style={{ color: "#00E5FF" }}
                    />
                    Computing…
                  </>
                ) : (
                  <>
                    <Calculator size={18} />
                    Calculate CGPA
                  </>
                )}
              </button>

              {/* Reset button (shown once results exist) */}
              {result && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-4 rounded-2xl font-syne font-semibold text-sm transition-all hover:bg-white/5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#64748B",
                  }}
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
              )}
            </div>

            <p
              style={{
                color: "#334155",
                fontSize: 11,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Courses with empty marks are excluded · Mandatory (MC)
              subjects excluded from GPA
            </p>
          </div>
        )}

        {/* ══ ANALYTICS RESULTS DASHBOARD ══════════════════════════════════ */}
        {result && (
          <div
            ref={resultsRef}
            className="mt-20 animate-fade-up"
            style={{ scrollMarginTop: "40px" }}
          >
            {/* Section divider */}
            <div className="flex items-center gap-4 mb-10">
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(0,229,255,0.3))",
                }}
              />
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{
                  background: "rgba(0,229,255,0.06)",
                  border: "1px solid rgba(0,229,255,0.15)",
                }}>
                <TrendingUp size={14} style={{ color: "#00E5FF" }} />
                <span
                  className="font-syne font-bold"
                  style={{
                    color: "#00E5FF",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                  }}
                >
                  ACADEMIC ANALYTICS
                </span>
              </div>
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(to left, transparent, rgba(0,229,255,0.3))",
                }}
              />
            </div>

            {/* ── Summary stat cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                wide
                icon={GraduationCap}
                label="CUMULATIVE CGPA"
                value={result.cgpa.toFixed(2)}
                accent="#00E5FF"
                sub="out of 10.00 · JNTUH R22"
              />
              <StatCard
                icon={Award}
                label="CREDITS EARNED"
                value={result.total_credits_earned}
                accent="#FF9500"
                sub="passed subjects"
              />
              <StatCard
                icon={BookOpen}
                label="CREDITS ATTEMPTED"
                value={result.total_credits_attempted}
                accent="#B345F1"
                sub="all non-MC subjects"
              />
            </div>

            {/* ── SGPA bar chart ───────────────────────────────────────────── */}
            <div
              className="rounded-2xl p-6 mb-8"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <p
                  className="font-syne font-semibold"
                  style={{ color: "#94A3B8", fontSize: 14 }}
                >
                  SGPA Progression — Semester by Semester
                </p>
                <div className="hidden sm:flex items-center gap-5 text-xs"
                  style={{ color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>
                  <span style={{ color: "#00E5FF" }}>■ ≥ 9.0</span>
                  <span style={{ color: "#B345F1" }}>■ 7–9</span>
                  <span style={{ color: "#FF9500" }}>■ 5–7</span>
                  <span style={{ color: "#FF3B30" }}>■ &lt; 5</span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={result.semesters.map((s) => ({
                    label:     `Sem ${s.semester}`,
                    fullLabel: s.label,
                    sgpa:      s.sgpa,
                  }))}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: "#475569",
                      fontSize: 11,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{
                      fill: "#334155",
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<SGPATooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.025)" }}
                  />
                  <Bar dataKey="sgpa" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {result.semesters.map((s, i) => (
                      <Cell key={i} fill={barColor(s.sgpa)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Detailed transcript ──────────────────────────────────────── */}
            <div>
              <p
                className="font-syne font-semibold mb-4"
                style={{ color: "#94A3B8", fontSize: 14 }}
              >
                Detailed Transcript
              </p>

              {result.semesters.map((sem) => (
                <div
                  key={sem.semester}
                  className="rounded-2xl mb-4 overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Semester transcript header */}
                  <div
                    className="flex flex-wrap items-center justify-between px-5 py-4 gap-3"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: "rgba(0,229,255,0.08)",
                          color: "#00E5FF",
                          fontFamily: "JetBrains Mono, monospace",
                          border: "1px solid rgba(0,229,255,0.15)",
                        }}
                      >
                        S{sem.semester}
                      </span>
                      <div>
                        <p
                          className="font-syne font-semibold text-white"
                          style={{ fontSize: 14 }}
                        >
                          {sem.label}
                        </p>
                        <p
                          style={{
                            color: "#475569",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 11,
                          }}
                        >
                          {sem.earned_credits}/{sem.total_credits} credits
                          earned
                        </p>
                      </div>
                    </div>

                    {/* SGPA display */}
                    <div className="text-right">
                      <p
                        style={{
                          color: "#475569",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          letterSpacing: "0.1em",
                        }}
                      >
                        SGPA
                      </p>
                      <p
                        className="font-syne font-extrabold"
                        style={{
                          color: barColor(sem.sgpa),
                          fontSize: 22,
                          lineHeight: 1,
                        }}
                      >
                        {sem.sgpa.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Column header */}
                  <div
                    className="hidden md:grid px-5 py-2"
                    style={{
                      gridTemplateColumns: "1fr 90px 40px 44px 44px 52px 44px 24px",
                      gap: "8px",
                      color: "#1E293B",
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span>Subject</span>
                    <span className="text-center">Code</span>
                    <span className="text-center">Cr</span>
                    <span className="text-center">Int</span>
                    <span className="text-center">Ext</span>
                    <span className="text-center">Total</span>
                    <span className="text-center">Grade</span>
                    <span />
                  </div>

                  {/* Course result rows */}
                  {sem.courses.map((c, idx) => {
                    const gm = GRADE_META[c.letter_grade] || GRADE_META["–"];
                    return (
                      <div
                        key={c.code}
                        className={`px-5 py-3 transition-colors hover:bg-white/[0.015] ${
                          idx < sem.courses.length - 1 ? ROW_BORDER : ""
                        }`}
                      >
                        {/* Desktop row */}
                        <div
                          className="hidden md:grid items-center"
                          style={{
                            gridTemplateColumns:
                              "1fr 90px 40px 44px 44px 52px 44px 24px",
                            gap: "8px",
                          }}
                        >
                          {/* Name */}
                          <div className="min-w-0">
                            <p
                              className="truncate"
                              style={{ color: "#CBD5E1", fontSize: 13 }}
                              title={c.name}
                            >
                              {c.name}
                            </p>
                          </div>

                          {/* Code */}
                          <div className="text-center">
                            <span
                              style={{
                                color: "#334155",
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: 10,
                              }}
                            >
                              {c.code}
                            </span>
                          </div>

                          {/* Credits */}
                          <div className="text-center">
                            <span
                              style={{
                                color:
                                  c.credits === 0 ? "#1E293B" : "#64748B",
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: 12,
                              }}
                            >
                              {c.credits}
                            </span>
                          </div>

                          {/* Internal */}
                          <div className="text-center">
                            <span
                              style={{
                                color: "#94A3B8",
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: 12,
                              }}
                            >
                              {c.internal_marks}
                            </span>
                          </div>

                          {/* External */}
                          <div className="text-center">
                            <span
                              style={{
                                color: "#94A3B8",
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: 12,
                              }}
                            >
                              {c.external_marks}
                            </span>
                          </div>

                          {/* Total */}
                          <div className="text-center">
                            <span
                              style={{
                                color: "#E2E8F0",
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              {c.total_marks}
                            </span>
                          </div>

                          {/* Grade badge */}
                          <div className="flex justify-center">
                            <span
                              className="px-2 py-0.5 rounded-lg text-xs font-bold"
                              style={{
                                background: gm.bg,
                                color: gm.color,
                                fontFamily: "JetBrains Mono, monospace",
                                minWidth: 34,
                                textAlign: "center",
                              }}
                            >
                              {c.letter_grade}
                            </span>
                          </div>

                          {/* Pass / Fail indicator */}
                          <div className="flex justify-center">
                            {c.mandatory ? (
                              <span
                                style={{
                                  color: "#334155",
                                  fontFamily: "JetBrains Mono, monospace",
                                  fontSize: 10,
                                }}
                              >
                                –
                              </span>
                            ) : c.passed ? (
                              <CheckCircle2
                                size={14}
                                style={{ color: "#00FF88" }}
                              />
                            ) : (
                              <XCircle
                                size={14}
                                style={{ color: "#FF3B30" }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Mobile row */}
                        <div className="md:hidden flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              style={{
                                color: "#CBD5E1",
                                fontSize: 13,
                                fontWeight: 500,
                              }}
                            >
                              {c.name}
                            </p>
                            <p
                              style={{
                                color: "#475569",
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: 11,
                                marginTop: 2,
                              }}
                            >
                              {c.code} · {c.credits}cr · {c.internal_marks}+
                              {c.external_marks}={c.total_marks}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="px-2 py-0.5 rounded-lg text-xs font-bold"
                              style={{
                                background: gm.bg,
                                color: gm.color,
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {c.letter_grade}
                            </span>
                            {!c.mandatory &&
                              (c.passed ? (
                                <CheckCircle2
                                  size={14}
                                  style={{ color: "#00FF88" }}
                                />
                              ) : (
                                <XCircle
                                  size={14}
                                  style={{ color: "#FF3B30" }}
                                />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ── Grade legend ─────────────────────────────────────────────── */}
            <div
              className="mt-6 rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <p
                className="font-syne font-semibold mb-4"
                style={{ color: "#475569", fontSize: 11, letterSpacing: "0.1em" }}
              >
                JNTUH R22 GRADE SCALE
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  ["O",  "≥ 90",  10],
                  ["A+", "≥ 80",   9],
                  ["A",  "≥ 70",   8],
                  ["B+", "≥ 60",   7],
                  ["B",  "≥ 50",   6],
                  ["C",  "≥ 40",   5],
                  ["F",  "< 40",   0],
                ].map(([g, range, pts]) => {
                  const gm = GRADE_META[g] || {};
                  return (
                    <div
                      key={g}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{
                        background: gm.bg,
                        border: `1px solid ${gm.color}22`,
                      }}
                    >
                      <span
                        style={{
                          color: gm.color,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 12,
                          fontWeight: 700,
                          minWidth: 22,
                        }}
                      >
                        {g}
                      </span>
                      <span
                        style={{
                          color: "#475569",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                        }}
                      >
                        {range} · {pts} GP
                      </span>
                    </div>
                  );
                })}
              </div>
              <p
                style={{
                  color: "#334155",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  marginTop: 12,
                }}
              >
                Pass condition: Total ≥ 40 AND External ≥ 21 · MC subjects
                graded S/U (excluded from GPA)
              </p>
            </div>
          </div>
        )}

        {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
        <footer className="mt-20 text-center">
          <p
            style={{
              color: "#1E293B",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            JNTUH R22 · CSE (AI &amp; ML) · 8-Semester Academic Tracker ·
            Render + Vercel
          </p>
        </footer>
      </div>
    </div>
  );
}
