"use client";

// app/dashboard/components/CriteriaInstancesPanel.tsx
// Displays the structured criteria instances collected from the conversation.
// Shows which fields have been captured and which are still missing.
// Logs database-ready instances to the console whenever they update.

import { useEffect } from "react";
import type { CriteriaInstance, CriteriaInstanceFields } from "../page";
import { CRITERIA_DEFINITIONS, fieldLabel, fieldTypeLabel } from "@/lib/criteriaSchema";

interface Props {
  instances: CriteriaInstance[];
}

export default function CriteriaInstancesPanel({ instances }: Props) {
  // Log the current database-ready state whenever instances change.
  useEffect(() => {
    if (!instances.length) return;
    console.log("══════════════════════════════════════════════════════");
    console.log("CRITERIA DATABASE INSTANCES (current state):");
    console.log(JSON.stringify(instances, null, 2));
    console.log("══════════════════════════════════════════════════════");
  }, [instances]);

  const completeCount = instances.filter((i) => i.complete).length;
  const totalCount = CRITERIA_DEFINITIONS.length;

  return (
    <div style={ci.container}>
      {/* Header */}
      <div style={ci.header}>
        <div style={ci.headerTitle}>Collected Data</div>
        <div style={ci.headerBadge}>
          {completeCount}/{totalCount} complete
        </div>
      </div>

      {/* Instance cards */}
      <div style={ci.body}>
        {CRITERIA_DEFINITIONS.map((def) => {
          const instance = instances.find((i) => i.criteria_id === def.id);
          return (
            <InstanceCard
              key={def.id}
              definition={def}
              instance={instance ?? null}
            />
          );
        })}

        {/* JSON preview block */}
        <div style={ci.jsonBlock}>
          <div style={ci.jsonLabel}>Database-ready JSON</div>
          <pre style={ci.jsonPre}>
            {JSON.stringify(
              instances.map((inst) => ({
                criteria_id: inst.criteria_id,
                criteria_name: inst.criteria_name,
                description: inst.description,
                fields: inst.fields,
                complete: inst.complete,
                missing_fields: inst.missing_fields,
              })),
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual instance card
// ---------------------------------------------------------------------------

function InstanceCard({
  definition,
  instance,
}: {
  definition: (typeof CRITERIA_DEFINITIONS)[number];
  instance: CriteriaInstance | null;
}) {
  const isComplete = instance?.complete ?? false;
  const missingFields = instance?.missing_fields ?? definition.fields.map((f) => f.name);
  const fields: CriteriaInstanceFields = instance?.fields ?? {};

  return (
    <div style={{ ...ci.card, ...(isComplete ? ci.cardComplete : {}) }}>
      {/* Card header */}
      <div style={ci.cardHeader}>
        <div>
          <div style={ci.cardName}>{definition.name}</div>
          <div style={ci.cardDesc}>{definition.description}</div>
        </div>
        <div
          style={{
            ...ci.statusBadge,
            ...(isComplete ? ci.statusComplete : missingFields.length === definition.fields.length ? ci.statusEmpty : ci.statusPartial),
          }}
        >
          {isComplete ? "Complete" : missingFields.length === definition.fields.length ? "Not started" : "Partial"}
        </div>
      </div>

      {/* Fields */}
      <div style={ci.fieldsGrid}>
        {definition.fields.map((fieldDef) => {
          const value = fields[fieldDef.name];
          const isMissing = value === null || value === undefined;
          return (
            <div key={fieldDef.name} style={{ ...ci.field, ...(isMissing ? ci.fieldMissing : ci.fieldFilled) }}>
              <div style={ci.fieldName}>{fieldLabel(fieldDef.name)}</div>
              {isMissing ? (
                <div style={ci.fieldEmpty}>
                  <span style={ci.missingDot}>○</span>
                  <span style={ci.fieldHint}>
                    {fieldDef.hint ?? fieldTypeLabel(fieldDef.type)}
                  </span>
                </div>
              ) : (
                <div style={ci.fieldValue}>
                  <span style={ci.filledDot}>●</span>
                  <FieldValueDisplay value={value} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Missing fields prompt */}
      {!isComplete && missingFields.length > 0 && (
        <div style={ci.missingPrompt}>
          Still needed: {missingFields.map(fieldLabel).join(", ")}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field value renderer
// ---------------------------------------------------------------------------

function FieldValueDisplay({ value }: { value: string | string[] | null }) {
  if (!value) return <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "#9ca3af", fontStyle: "italic" }}>none</span>;
    return (
      <ul style={ci.valueList}>
        {value.map((v, i) => (
          <li key={i} style={ci.valueListItem}>
            {v.startsWith("http") ? (
              <span style={ci.urlValue}>{v}</span>
            ) : (
              v
            )}
          </li>
        ))}
      </ul>
    );
  }

  return <span style={ci.textValue}>{value}</span>;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const ci: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px 10px",
    borderBottom: "1px solid #f0efff",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#7c3aed",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  headerBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#4f46e5",
    background: "#f5f3ff",
    padding: "2px 8px",
    borderRadius: 99,
    border: "1px solid #ddd6fe",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 12px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  /* Cards */
  card: {
    background: "#fafafa",
    border: "1px solid #e8e5ff",
    borderRadius: 10,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardComplete: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e1b4b",
    lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 7px",
    borderRadius: 99,
    flexShrink: 0,
    letterSpacing: "0.03em",
  },
  statusComplete: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },
  statusPartial: {
    background: "#fef9c3",
    color: "#92400e",
    border: "1px solid #fde68a",
  },
  statusEmpty: {
    background: "#f3f4f6",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
  },
  /* Fields grid */
  fieldsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  field: {
    borderRadius: 6,
    padding: "5px 8px",
    fontSize: 12,
  },
  fieldMissing: {
    background: "#fef2f2",
    border: "1px dashed #fecaca",
  },
  fieldFilled: {
    background: "#f0fdf4",
    border: "1px solid #d1fae5",
  },
  fieldName: {
    fontSize: 10,
    fontWeight: 700,
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 2,
  },
  fieldEmpty: {
    display: "flex",
    alignItems: "flex-start",
    gap: 5,
    color: "#ef4444",
    fontSize: 11,
  },
  fieldValue: {
    display: "flex",
    alignItems: "flex-start",
    gap: 5,
    color: "#166534",
    fontSize: 12,
    lineHeight: 1.5,
  },
  fieldHint: {
    color: "#9ca3af",
    fontStyle: "italic",
    fontSize: 11,
  },
  missingDot: {
    flexShrink: 0,
    fontSize: 10,
    lineHeight: "17px",
    color: "#f87171",
  },
  filledDot: {
    flexShrink: 0,
    fontSize: 7,
    lineHeight: "19px",
    color: "#16a34a",
  },
  textValue: {
    wordBreak: "break-word",
    color: "#1e1b4b",
    fontSize: 12,
  },
  urlValue: {
    color: "#4f46e5",
    wordBreak: "break-all",
    fontSize: 11,
  },
  valueList: {
    margin: "0",
    padding: "0 0 0 12px",
    listStyle: "disc",
    color: "#1e1b4b",
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  valueListItem: {
    lineHeight: 1.4,
  },
  missingPrompt: {
    fontSize: 11,
    color: "#92400e",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 5,
    padding: "4px 8px",
    lineHeight: 1.5,
  },
  /* JSON block */
  jsonBlock: {
    background: "#1e1b4b",
    borderRadius: 8,
    padding: "10px 12px",
    marginTop: 4,
  },
  jsonLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#a5b4fc",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
  },
  jsonPre: {
    margin: 0,
    fontSize: 10,
    color: "#c7d2fe",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    lineHeight: 1.6,
    maxHeight: 280,
    overflowY: "auto",
  },
};
