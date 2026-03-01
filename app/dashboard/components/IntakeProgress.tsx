"use client";

// app/dashboard/components/IntakeProgress.tsx
// Sidebar showing per-criterion strength badge + field-level completion.

import { CASE_STRATEGY, IntakeState, FieldValue } from "@/lib/caseStrategy";
import type { CriterionAssessment } from "@/app/api/chat/route";

type Strength = "strong" | "medium" | "weak" | "pending";

const STRENGTH_STYLES: Record<Strength, { bg: string; color: string; label: string }> = {
  strong:  { bg: "#dcfce7", color: "#15803d", label: "Strong" },
  medium:  { bg: "#fef9c3", color: "#a16207", label: "Medium" },
  weak:    { bg: "#fee2e2", color: "#b91c1c", label: "Weak" },
  pending: { bg: "#f1f5f9", color: "#94a3b8", label: "Pending" },
};

interface Props {
  intakeState: IntakeState;
  criterionAssessment: CriterionAssessment[];
}

export default function IntakeProgress({ intakeState, criterionAssessment }: Props) {
  // Build a quick lookup: criterion_name -> assessment
  const assessmentMap = Object.fromEntries(
    criterionAssessment.map((a) => [a.criterion_name, a])
  );

  // Overall counts
  let totalFields = 0;
  let collectedCount = 0;
  for (const criterion of CASE_STRATEGY.criteria) {
    for (const field of criterion.fields) {
      totalFields++;
      if (isCollected(intakeState[criterion.name]?.[field.name])) collectedCount++;
    }
  }

  const allDone = collectedCount === totalFields;
  const pct = totalFields === 0 ? 0 : Math.round((collectedCount / totalFields) * 100);

  return (
    <div>
      {/* ── Overall progress bar ── */}
      <div style={ip.overallBox}>
        <div style={ip.overallRow}>
          <span style={ip.overallLabel}>
            {collectedCount} / {totalFields} fields collected
          </span>
          <span style={{ ...ip.pct, color: allDone ? "#16a34a" : "#7c3aed" }}>{pct}%</span>
        </div>
        <div style={ip.track}>
          <div
            style={{
              ...ip.fill,
              width: `${pct}%`,
              background: allDone ? "#16a34a" : "#7c3aed",
            }}
          />
        </div>
      </div>

      {allDone && (
        <div style={ip.doneBanner}>
          All fields collected! Check the browser console for the DB records.
        </div>
      )}

      {/* ── Per-criterion cards ── */}
      {CASE_STRATEGY.criteria.map((criterion) => {
        const criterionState = intakeState[criterion.name] ?? {};
        const done = criterion.fields.filter((f) => isCollected(criterionState[f.name])).length;
        const total = criterion.fields.length;

        const assessment = assessmentMap[criterion.name];
        const strength: Strength = assessment?.strength ?? "pending";
        const s = STRENGTH_STYLES[strength];

        return (
          <div key={criterion.name} style={ip.section}>
            {/* Criterion header */}
            <div style={ip.criterionHeader}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={ip.criterionName}>{criterion.name}</div>
                <div style={ip.criterionDesc}>{criterion.description}</div>
                {/* Rationale shown when we have an actual assessment */}
                {assessment && strength !== "pending" && (
                  <div style={ip.rationale}>{assessment.rationale}</div>
                )}
              </div>
              <div style={ip.badges}>
                {/* Strength badge */}
                <span style={{ ...ip.strengthBadge, background: s.bg, color: s.color }}>
                  {s.label}
                </span>
                {/* Field count */}
                <span
                  style={{
                    ...ip.countBadge,
                    color: done === total ? "#16a34a" : "#7c3aed",
                    background: done === total ? "#dcfce7" : "#ede9fe",
                  }}
                >
                  {done}/{total}
                </span>
              </div>
            </div>

            {/* Fields — only show when at least one field is collected, or always show for context */}
            <div style={ip.fieldList}>
              {criterion.fields.map((field) => {
                const value = criterionState[field.name];
                const collected = isCollected(value);

                return (
                  <div key={field.name} style={ip.fieldRow}>
                    <span style={{ ...ip.icon, color: collected ? "#16a34a" : "#cbd5e1" }}>
                      {collected ? "✓" : "○"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          ...ip.fieldName,
                          color: collected ? "#1e293b" : "#94a3b8",
                        }}
                      >
                        {field.name.replace(/_/g, " ")}
                        {field.hint && !collected && (
                          <span style={ip.hint}> — {field.hint}</span>
                        )}
                      </div>
                      {collected && (
                        <div style={ip.collectedValue}>{formatValue(value)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCollected(val: FieldValue | undefined | null): boolean {
  if (val === null || val === undefined || val === "") return false;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

function formatValue(value: FieldValue): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    const joined = value.join(", ");
    return joined.length > 52 ? joined.slice(0, 50) + "…" : joined;
  }
  const s = String(value);
  return s.length > 52 ? s.slice(0, 50) + "…" : s;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const ip: Record<string, React.CSSProperties> = {
  overallBox: {
    marginBottom: 14,
    padding: "10px 12px",
    background: "#f5f3ff",
    borderRadius: 8,
    border: "1px solid #ede9fe",
  },
  overallRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  overallLabel: { fontSize: 12, fontWeight: 600, color: "#4b5563" },
  pct: { fontSize: 12, fontWeight: 700 },
  track: { height: 6, background: "#e0deff", borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  doneBanner: {
    marginBottom: 14,
    padding: "10px 12px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    fontSize: 12,
    color: "#166534",
    fontWeight: 500,
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 12,
    border: "1px solid #e8e5ff",
    borderRadius: 8,
    overflow: "hidden",
  },
  criterionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px 10px",
    background: "#faf8ff",
    borderBottom: "1px solid #ede9fe",
  },
  criterionName: { fontSize: 12, fontWeight: 700, color: "#1e1b4b" },
  criterionDesc: { fontSize: 10, color: "#94a3b8", marginTop: 1 },
  rationale: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 1.4,
    fontStyle: "italic",
  },
  badges: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  strengthBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 4,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
  },
  countBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 6px",
    borderRadius: 10,
    whiteSpace: "nowrap" as const,
  },
  fieldList: {
    padding: "6px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldRow: { display: "flex", gap: 7, alignItems: "flex-start" },
  icon: { fontSize: 12, lineHeight: "18px", flexShrink: 0, fontWeight: 700 },
  fieldName: { fontSize: 11, fontWeight: 500, lineHeight: "18px" },
  hint: { fontWeight: 400, color: "#b0b8c1", fontStyle: "italic" },
  collectedValue: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 1,
    lineHeight: 1.4,
    wordBreak: "break-all" as const,
  },
};
