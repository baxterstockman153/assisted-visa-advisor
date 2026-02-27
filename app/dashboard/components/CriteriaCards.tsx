"use client";

import { useState } from "react";
import type { CriteriaAnalysis, CriterionEntry, NotSupportedEntry } from "../page";

// ---------------------------------------------------------------------------
// Strength badge
// ---------------------------------------------------------------------------

const STRENGTH: Record<
  "strong" | "medium" | "weak",
  { bg: string; color: string; label: string }
> = {
  strong: { bg: "#dcfce7", color: "#15803d", label: "Strong" },
  medium: { bg: "#fef9c3", color: "#a16207", label: "Medium" },
  weak: { bg: "#fee2e2", color: "#b91c1c", label: "Weak" },
};

// ---------------------------------------------------------------------------
// CriterionCard
// ---------------------------------------------------------------------------

function CriterionCard({
  entry,
  defaultOpen = false,
}: {
  entry: CriterionEntry;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const s = STRENGTH[entry.strength] ?? STRENGTH.weak;

  return (
    <div style={cs.card}>
      {/* Header — always visible, click to expand */}
      <button
        style={cs.cardHeader}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div style={{ flex: 1, textAlign: "left" }}>
          <span style={{ ...cs.badge, background: s.bg, color: s.color }}>{s.label}</span>
          <div style={cs.criterionName}>{entry.criterion_name}</div>
          <div style={cs.criterionId}>{entry.criterion_id}</div>
        </div>
        <span style={cs.chevron}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Expandable body */}
      {open && (
        <div style={cs.cardBody}>
          {entry.rationale && <p style={cs.rationale}>{entry.rationale}</p>}

          {entry.evidence.length > 0 && (
            <section>
              <div style={cs.sectionLabel}>Evidence found</div>
              {entry.evidence.map((ev, i) => (
                <div key={i} style={cs.evidenceBlock}>
                  <div style={cs.snippet}>"{ev.snippet}"</div>
                  <div style={cs.why}>{ev.why_it_matters}</div>
                  {ev.file_id && (
                    <div style={cs.fileId}>File: {ev.file_id}</div>
                  )}
                </div>
              ))}
            </section>
          )}

          {entry.gaps.length > 0 && (
            <section>
              <div style={cs.sectionLabel}>Gaps</div>
              <ul style={cs.ul}>
                {entry.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </section>
          )}

          {entry.next_steps.length > 0 && (
            <section>
              <div style={cs.sectionLabel}>Next steps</div>
              <ul style={cs.ul}>
                {entry.next_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotSupportedRow
// ---------------------------------------------------------------------------

function NotSupportedRow({ entry }: { entry: NotSupportedEntry }) {
  return (
    <div style={cs.notSupportedRow}>
      <span style={cs.notSupportedId}>{entry.criterion_id}</span>
      <span style={cs.notSupportedReason}>{entry.reason}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CriteriaCards (export)
// ---------------------------------------------------------------------------

export default function CriteriaCards({ criteria }: { criteria: CriteriaAnalysis | null }) {
  if (!criteria) {
    return (
      <div style={cs.empty}>
        Upload your documents, then send a message to see how your evidence maps to O-1
        criteria.
      </div>
    );
  }

  return (
    <div>
      {/* Classification guess */}
      {criteria.classification_guess && (
        <div style={cs.classGuess}>
          Likely visa type:{" "}
          <strong style={{ color: "#1d4ed8" }}>{criteria.classification_guess}</strong>
        </div>
      )}

      {/* Top criteria */}
      {criteria.top_criteria.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={cs.groupLabel}>Top criteria</div>
          {criteria.top_criteria.map((c) => (
            <CriterionCard key={c.criterion_id} entry={c} defaultOpen={true} />
          ))}
        </section>
      )}

      {/* Other possible */}
      {criteria.other_possible_criteria.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={cs.groupLabel}>Other possible</div>
          {criteria.other_possible_criteria.map((c) => (
            <CriterionCard key={c.criterion_id} entry={c} />
          ))}
        </section>
      )}

      {/* Not yet supported */}
      {criteria.not_supported_yet.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={cs.groupLabel}>Not yet supported</div>
          {criteria.not_supported_yet.map((c) => (
            <NotSupportedRow key={c.criterion_id} entry={c} />
          ))}
        </section>
      )}

      {/* Disclaimer */}
      {criteria.disclaimer && <p style={cs.disclaimer}>{criteria.disclaimer}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const cs: Record<string, React.CSSProperties> = {
  empty: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    padding: "32px 8px",
    lineHeight: 1.6,
  },
  classGuess: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    color: "#1e40af",
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 6,
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    width: "100%",
    padding: "10px 12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  badge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  criterionName: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  criterionId: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  chevron: { fontSize: 10, color: "#94a3b8", marginLeft: 8, flexShrink: 0, paddingTop: 2 },
  cardBody: {
    padding: "0 12px 12px",
    borderTop: "1px solid #f1f5f9",
  },
  rationale: { fontSize: 12, color: "#475569", margin: "8px 0", lineHeight: 1.55 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: "10px 0 4px",
  },
  evidenceBlock: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    padding: "6px 8px",
    marginBottom: 4,
  },
  snippet: { fontSize: 11, fontStyle: "italic", color: "#475569", marginBottom: 3 },
  why: { fontSize: 11, color: "#64748b" },
  fileId: { fontSize: 10, color: "#94a3b8", marginTop: 3, fontFamily: "monospace" },
  ul: { margin: "2px 0 0", paddingLeft: 16, fontSize: 12, color: "#475569", lineHeight: 1.6 },
  notSupportedRow: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    padding: "4px 0",
    fontSize: 12,
  },
  notSupportedId: { fontFamily: "monospace", color: "#cbd5e1", flexShrink: 0 },
  notSupportedReason: { color: "#94a3b8" },
  disclaimer: {
    fontSize: 10,
    color: "#94a3b8",
    fontStyle: "italic",
    lineHeight: 1.5,
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid #f1f5f9",
  },
};
