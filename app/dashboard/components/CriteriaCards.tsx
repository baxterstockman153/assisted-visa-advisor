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
// WhatWeNeedNext (named export — rendered pinned in sidebar footer)
// ---------------------------------------------------------------------------

export function WhatWeNeedNext({
  criteria,
  onSend,
}: {
  criteria: CriteriaAnalysis | null;
  onSend?: (message: string) => void;
}) {
  if (!criteria) return null;

  const strongCount = criteria.top_criteria.filter((c) => c.strength === "strong").length;
  const hasThreeStrong = strongCount >= 3;

  if (hasThreeStrong) {
    return (
      <div style={wn.box}>
        <div style={wn.header}>
          <span style={wn.headerTitle}>Ready to File</span>
        </div>

        <div style={wn.successBanner}>
          <div style={wn.successEmoji}>🎉</div>
          <div>
            <div style={wn.successTitle}>3 strong qualifications found!</div>
            <div style={wn.successDesc}>
              Your case looks ready for professional attorney review.
            </div>
          </div>
        </div>

        <button
          style={wn.attorneyBtn}
          onClick={() => alert("to be implemented")}
        >
          Send to Attorney →
        </button>

        <p style={wn.legalNote}>
          An attorney can review your evidence package and file your O-1 petition.
        </p>
      </div>
    );
  }

  // Not enough strong qualifications — show guidance
  const needed = Math.max(0, 3 - strongCount);

  return (
    <div style={wn.box}>
      <div style={wn.header}>
        <span style={wn.headerTitle}>What We Need Next</span>
      </div>

      {/* Progress indicator */}
      <div style={wn.progress}>
        <div style={wn.progressLabel}>
          <span>{strongCount} of 3 strong criteria</span>
          <span style={{ color: needed > 0 ? "#b91c1c" : "#16a34a", fontWeight: 600 }}>
            {needed > 0 ? `${needed} more needed` : "almost there!"}
          </span>
        </div>
        <div style={wn.progressTrack}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                ...wn.progressSegment,
                background: i < strongCount ? "#16a34a" : "#e2e8f0",
              }}
            />
          ))}
        </div>
      </div>

      {/* Action steps */}
      <div style={wn.steps}>
        {/* Step 1: Upload more evidence */}
        <div style={wn.step}>
          <div style={wn.stepNum}>1</div>
          <div style={wn.stepContent}>
            <div style={wn.stepTitle}>Upload more evidence</div>
            <div style={wn.stepDesc}>
              Add recommendation letters, publications, awards, media coverage, or salary data.
            </div>
          </div>
        </div>

        {/* Step 2: Brainstorm with Ava */}
        <div style={wn.step}>
          <div style={wn.stepNum}>2</div>
          <div style={wn.stepContent}>
            <div style={wn.stepTitle}>Brainstorm with Ava</div>
            <div style={wn.stepDesc}>
              Discover hidden qualifications you might be overlooking.
            </div>
            <button
              style={wn.brainstormBtn}
              onClick={() =>
                onSend?.(
                  "Let's brainstorm together. Based on my background and what's been assessed so far, walk me through each O-1 criterion I'm not yet meeting. For each one, give me specific and concrete examples of evidence or achievements that would qualify — things I might be overlooking or undervaluing."
                )
              }
            >
              Start Brainstorming →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles — CriteriaCards
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

// ---------------------------------------------------------------------------
// Styles — WhatWeNeedNext
// ---------------------------------------------------------------------------

const wn: Record<string, React.CSSProperties> = {
  box: {
    background: "#fafaf9",
    borderTop: "2px solid #e8e5ff",
    padding: "14px 12px 16px",
    flexShrink: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#7c3aed",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  /* Success / ready-to-file state */
  successBanner: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    padding: "10px 12px",
    marginBottom: 10,
  },
  successEmoji: {
    fontSize: 18,
    flexShrink: 0,
    lineHeight: 1,
    marginTop: 1,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#166534",
    marginBottom: 2,
  },
  successDesc: {
    fontSize: 11,
    color: "#4b5563",
    lineHeight: 1.45,
  },
  attorneyBtn: {
    width: "100%",
    padding: "10px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "inherit",
  },
  legalNote: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
    margin: 0,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  /* Progress */
  progress: {
    marginBottom: 12,
  },
  progressLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#64748b",
    marginBottom: 6,
    fontWeight: 500,
  },
  progressTrack: {
    display: "flex",
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    transition: "background 0.3s",
  },
  /* Action steps */
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  step: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    background: "#fff",
    border: "1px solid #e8e5ff",
    borderRadius: 8,
    padding: "10px 12px",
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#ede9fe",
    color: "#7c3aed",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 1.45,
  },
  brainstormBtn: {
    display: "inline-block",
    marginTop: 8,
    padding: "5px 12px",
    background: "#f5f3ff",
    border: "1px solid #ddd6fe",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: "#4f46e5",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
