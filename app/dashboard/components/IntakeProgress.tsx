"use client";

// app/dashboard/components/IntakeProgress.tsx
// Sidebar component showing field-level intake completion per criterion.

import { CASE_STRATEGY, IntakeState, FieldValue } from "@/lib/caseStrategy";

interface Props {
  intakeState: IntakeState;
}

export default function IntakeProgress({ intakeState }: Props) {
  // Compute overall counts
  let totalFields = 0;
  let collectedFields = 0;
  for (const criterion of CASE_STRATEGY.criteria) {
    for (const field of criterion.fields) {
      totalFields++;
      const val = intakeState[criterion.name]?.[field.name];
      if (val !== null && val !== undefined && val !== "") {
        collectedFields++;
      }
    }
  }

  const allDone = collectedFields === totalFields;
  const pct = totalFields === 0 ? 0 : Math.round((collectedFields / totalFields) * 100);

  return (
    <div>
      {/* ── Overall progress bar ── */}
      <div style={ip.overallBox}>
        <div style={ip.overallRow}>
          <span style={ip.overallLabel}>
            {collectedFields} / {totalFields} fields collected
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

      {/* ── Per-criterion sections ── */}
      {CASE_STRATEGY.criteria.map((criterion) => {
        const criterionState = intakeState[criterion.name] ?? {};
        const done = criterion.fields.filter((f) => {
          const v = criterionState[f.name];
          return v !== null && v !== undefined && v !== "";
        }).length;
        const total = criterion.fields.length;
        const allCritDone = done === total;

        return (
          <div key={criterion.name} style={ip.section}>
            {/* Criterion header */}
            <div style={ip.criterionHeader}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={ip.criterionName}>{criterion.name}</div>
                <div style={ip.criterionDesc}>{criterion.description}</div>
              </div>
              <span
                style={{
                  ...ip.criterionCount,
                  color: allCritDone ? "#16a34a" : "#7c3aed",
                  background: allCritDone ? "#dcfce7" : "#ede9fe",
                }}
              >
                {done}/{total}
              </span>
            </div>

            {/* Fields */}
            <div style={ip.fieldList}>
              {criterion.fields.map((field) => {
                const value = criterionState[field.name];
                const isCollected = value !== null && value !== undefined && value !== "";

                return (
                  <div key={field.name} style={ip.fieldRow}>
                    {/* Status icon */}
                    <span
                      style={{
                        ...ip.icon,
                        color: isCollected ? "#16a34a" : "#cbd5e1",
                      }}
                    >
                      {isCollected ? "✓" : "○"}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Field name */}
                      <div
                        style={{
                          ...ip.fieldName,
                          color: isCollected ? "#1e293b" : "#94a3b8",
                        }}
                      >
                        {field.name.replace(/_/g, " ")}
                        {field.hint && !isCollected && (
                          <span style={ip.hint}> — {field.hint}</span>
                        )}
                      </div>

                      {/* Collected value (truncated) */}
                      {isCollected && (
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

function formatValue(value: FieldValue): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    const joined = value.join(", ");
    return joined.length > 50 ? joined.slice(0, 48) + "…" : joined;
  }
  const s = String(value);
  return s.length > 50 ? s.slice(0, 48) + "…" : s;
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
  overallLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#4b5563",
  },
  pct: {
    fontSize: 12,
    fontWeight: 700,
  },
  track: {
    height: 6,
    background: "#e0deff",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.4s ease",
  },
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
    marginBottom: 14,
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
  criterionName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1e1b4b",
  },
  criterionDesc: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 1,
  },
  criterionCount: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 10,
    flexShrink: 0,
    marginTop: 1,
  },
  fieldList: {
    padding: "6px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldRow: {
    display: "flex",
    gap: 7,
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 12,
    lineHeight: "18px",
    flexShrink: 0,
    fontWeight: 700,
  },
  fieldName: {
    fontSize: 11,
    fontWeight: 500,
    lineHeight: "18px",
  },
  hint: {
    fontWeight: 400,
    color: "#b0b8c1",
    fontStyle: "italic",
  },
  collectedValue: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 1,
    lineHeight: 1.4,
    wordBreak: "break-all",
  },
};
