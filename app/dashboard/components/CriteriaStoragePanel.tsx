"use client";

// app/dashboard/components/CriteriaStoragePanel.tsx
// Shows structured criteria data cards — what has been collected and what is still missing.

import { useState } from "react";
import type { CriteriaInstance, FieldValue } from "@/lib/criteriaStorage";
import { completionPercent, CRITERIA_TEMPLATES } from "@/lib/criteriaStorage";

// ---------------------------------------------------------------------------
// Field type icon
// ---------------------------------------------------------------------------

function FieldTypeIcon({ type }: { type: FieldValue["type"] }) {
  const map: Record<string, string> = {
    text: "T",
    date: "📅",
    files: "📎",
    files_or_urls: "🔗",
  };
  return (
    <span style={fs.typeIcon} title={type}>
      {map[type] ?? "?"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single field row
// ---------------------------------------------------------------------------

function FieldRow({ field }: { field: FieldValue }) {
  return (
    <div style={fs.fieldRow}>
      <div style={fs.fieldLeft}>
        <FieldTypeIcon type={field.type} />
        <div>
          <div style={fs.fieldLabel}>{field.label}</div>
          {field.hint && !field.collected && (
            <div style={fs.fieldHint}>{field.hint}</div>
          )}
        </div>
      </div>
      <div style={fs.fieldRight}>
        {field.collected && field.value ? (
          <div style={fs.fieldValue}>
            <span style={fs.checkmark}>✓</span>
            <span style={fs.valueText}>{field.value}</span>
          </div>
        ) : (
          <span style={fs.missingBadge}>Missing</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress ring (simple text-based arc)
// ---------------------------------------------------------------------------

function ProgressBar({ percent }: { percent: number }) {
  const color =
    percent === 100 ? "#16a34a" : percent >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={fs.progressWrap}>
      <div style={{ ...fs.progressTrack }}>
        <div
          style={{
            ...fs.progressFill,
            width: `${percent}%`,
            background: color,
          }}
        />
      </div>
      <span style={{ ...fs.progressLabel, color }}>{percent}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single criteria instance card
// ---------------------------------------------------------------------------

function InstanceCard({
  instance,
  defaultOpen,
}: {
  instance: CriteriaInstance;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const pct = completionPercent(instance);
  const collectedCount = instance.fields.filter((f) => f.collected).length;
  const totalCount = instance.fields.length;

  // Enrich fields with label/hint from templates if missing
  const template = CRITERIA_TEMPLATES[instance.criterion_id];
  const enrichedFields: FieldValue[] = instance.fields.map((f) => {
    const tpl = template?.fields.find((tf) => tf.name === f.name);
    return {
      ...f,
      label: f.label || tpl?.label || f.name,
      hint: f.hint ?? tpl?.hint,
    };
  });

  const statusColor =
    pct === 100 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={ic.card}>
      {/* Card header */}
      <button
        style={ic.header}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div style={ic.headerLeft}>
          <div style={ic.criterionName}>{instance.name}</div>
          {instance.description && (
            <div style={ic.description}>{instance.description}</div>
          )}
          <div style={ic.statsRow}>
            <span style={{ ...ic.statChip, color: statusColor }}>
              {collectedCount}/{totalCount} fields
            </span>
            {pct === 100 && (
              <span style={ic.completeBadge}>Complete</span>
            )}
          </div>
        </div>
        <div style={ic.headerRight}>
          <ProgressBar percent={pct} />
          <span style={ic.chevron}>{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expandable field list */}
      {open && (
        <div style={ic.body}>
          {enrichedFields.map((field) => (
            <FieldRow key={field.name} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div style={ps.empty}>
      <div style={ps.emptyIcon}>📋</div>
      <div style={ps.emptyTitle}>No criteria data yet</div>
      <div style={ps.emptyDesc}>
        Tell Ava about your work experience, achievements, and qualifications.
        She&apos;ll identify which O-1 criteria apply and collect the information
        needed to build your application record.
      </div>
      <div style={ps.emptyHints}>
        <div style={ps.hint}>💡 &quot;I&apos;m a founding engineer at a YC startup&quot;</div>
        <div style={ps.hint}>💡 &quot;I&apos;ve published research on machine learning&quot;</div>
        <div style={ps.hint}>💡 &quot;I earn $400k/year in San Francisco&quot;</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview summary bar
// ---------------------------------------------------------------------------

function SummaryBar({ instances }: { instances: CriteriaInstance[] }) {
  const complete = instances.filter((i) => completionPercent(i) === 100).length;
  const inProgress = instances.filter((i) => {
    const p = completionPercent(i);
    return p > 0 && p < 100;
  }).length;
  const empty = instances.filter((i) => completionPercent(i) === 0).length;

  return (
    <div style={ps.summaryBar}>
      <div style={ps.summaryItem}>
        <span style={{ ...ps.summaryNum, color: "#16a34a" }}>{complete}</span>
        <span style={ps.summaryLabel}>Complete</span>
      </div>
      <div style={ps.summaryDivider} />
      <div style={ps.summaryItem}>
        <span style={{ ...ps.summaryNum, color: "#d97706" }}>{inProgress}</span>
        <span style={ps.summaryLabel}>In Progress</span>
      </div>
      <div style={ps.summaryDivider} />
      <div style={ps.summaryItem}>
        <span style={{ ...ps.summaryNum, color: "#dc2626" }}>{empty}</span>
        <span style={ps.summaryLabel}>Not Started</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Console logger (logs current DB instance shape)
// ---------------------------------------------------------------------------

function logInstances(instances: CriteriaInstance[]) {
  console.log(
    "[CriteriaStorage] Current database instances:",
    JSON.stringify({ criteria: instances }, null, 2)
  );
}

// ---------------------------------------------------------------------------
// CriteriaStoragePanel (main export)
// ---------------------------------------------------------------------------

export default function CriteriaStoragePanel({
  instances,
}: {
  instances: CriteriaInstance[];
}) {
  if (instances.length === 0) {
    return <EmptyState />;
  }

  // Sort: complete last, in-progress first
  const sorted = [...instances].sort((a, b) => {
    const pa = completionPercent(a);
    const pb = completionPercent(b);
    if (pa === 100 && pb !== 100) return 1;
    if (pb === 100 && pa !== 100) return -1;
    return pb - pa;
  });

  return (
    <div>
      <SummaryBar instances={instances} />

      {/* Log to console button */}
      <button
        style={ps.logBtn}
        onClick={() => logInstances(instances)}
        title="Log current database instances to browser console"
      >
        📋 Log DB Instances to Console
      </button>

      {sorted.map((instance, idx) => (
        <InstanceCard
          key={instance.criterion_id}
          instance={instance}
          defaultOpen={idx === 0}
        />
      ))}

      <p style={ps.note}>
        Data is collected from your conversation with Ava. Keep chatting to fill
        in missing fields. No information is saved to a database yet.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles — field rows
// ---------------------------------------------------------------------------

const fs: Record<string, React.CSSProperties> = {
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "7px 0",
    borderBottom: "1px solid #f8fafc",
    gap: 8,
  },
  fieldLeft: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
  },
  typeIcon: {
    fontSize: 11,
    color: "#94a3b8",
    flexShrink: 0,
    marginTop: 1,
    width: 16,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#1e293b",
    lineHeight: 1.4,
  },
  fieldHint: {
    fontSize: 10,
    color: "#94a3b8",
    lineHeight: 1.4,
    marginTop: 1,
  },
  fieldRight: {
    flexShrink: 0,
    maxWidth: "50%",
    textAlign: "right",
  },
  fieldValue: {
    display: "flex",
    alignItems: "flex-start",
    gap: 4,
    justifyContent: "flex-end",
  },
  checkmark: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
  },
  valueText: {
    fontSize: 11,
    color: "#374151",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  missingBadge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 600,
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 3,
    padding: "1px 5px",
  },
  progressWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  progressTrack: {
    width: 56,
    height: 5,
    background: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.3s",
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: 700,
    minWidth: 28,
    textAlign: "right",
  },
};

// ---------------------------------------------------------------------------
// Styles — instance card
// ---------------------------------------------------------------------------

const ic: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  criterionName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  statsRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  statChip: {
    fontSize: 10,
    fontWeight: 600,
  },
  completeBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: "#16a34a",
    background: "#dcfce7",
    padding: "1px 5px",
    borderRadius: 3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  chevron: {
    fontSize: 10,
    color: "#94a3b8",
  },
  body: {
    padding: "0 12px 8px",
    borderTop: "1px solid #f1f5f9",
  },
};

// ---------------------------------------------------------------------------
// Styles — panel
// ---------------------------------------------------------------------------

const ps: Record<string, React.CSSProperties> = {
  summaryBar: {
    display: "flex",
    gap: 0,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  summaryItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "8px 4px",
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    background: "#e2e8f0",
    alignSelf: "stretch",
    margin: "6px 0",
  },
  logBtn: {
    display: "block",
    width: "100%",
    marginBottom: 12,
    padding: "7px 12px",
    background: "#f5f3ff",
    border: "1px solid #ddd6fe",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: "#4f46e5",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "center",
  },
  note: {
    fontSize: 10,
    color: "#94a3b8",
    fontStyle: "italic",
    lineHeight: 1.5,
    marginTop: 8,
    textAlign: "center",
  },
  empty: {
    padding: "24px 8px",
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 1.55,
    marginBottom: 12,
  },
  emptyHints: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  hint: {
    fontSize: 11,
    color: "#64748b",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 5,
    padding: "5px 8px",
    textAlign: "left",
    lineHeight: 1.4,
  },
};
