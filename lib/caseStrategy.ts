// lib/caseStrategy.ts
// Defines the O-1 case strategy and intake state types.

export interface CriterionField {
  name: string;
  type: "text" | "date" | "files" | "files_or_urls";
  hint?: string;
}

export interface Criterion {
  name: string;
  description: string;
  fields: CriterionField[];
}

export interface CaseStrategy {
  criteria: Criterion[];
}

// A collected field value: plain string for text/date, array for files/urls
export type FieldValue = string | string[] | null;

// All collected fields for one criterion
export type CollectedFields = Record<string, FieldValue>;

// Top-level intake state: criterion name -> collected fields map
export type IntakeState = Record<string, CollectedFields>;

// ---------------------------------------------------------------------------
// Hardcoded case strategy (swap this out per-applicant in a real system)
// ---------------------------------------------------------------------------

export const CASE_STRATEGY: CaseStrategy = {
  criteria: [
    {
      name: "Critical Role",
      description: "Founding Engineer at Bland",
      fields: [
        { name: "start_date", type: "date" },
        { name: "end_date", type: "date" },
        { name: "key_responsibilities", type: "text" },
        {
          name: "examples",
          type: "files_or_urls",
          hint: "Product roadmaps, technical diagrams, speaking invites, blog posts, dashboards showing project ownership",
        },
      ],
    },
    {
      name: "High Remuneration",
      description: "Founding Engineer at Bland",
      fields: [
        { name: "work_location", type: "text" },
        { name: "salary", type: "text", hint: "Include currency" },
        { name: "paystubs", type: "files", hint: "Last 4 paystubs" },
        {
          name: "equity_proof",
          type: "files_or_urls",
          hint: "Carta screenshot or equivalent",
        },
      ],
    },
    {
      name: "Original Contributions",
      description: "Bland",
      fields: [
        {
          name: "work_description",
          type: "text",
          hint: "Describe your work and unique contributions",
        },
        {
          name: "impact_description",
          type: "text",
          hint: "Describe the impact to the field/world",
        },
        { name: "supporting_evidence", type: "files_or_urls" },
      ],
    },
    {
      name: "Membership",
      description: "Y Combinator",
      fields: [
        { name: "date_selected", type: "date" },
        { name: "proof_of_membership", type: "files_or_urls" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a fresh IntakeState with every field set to null. */
export function initIntakeState(strategy: CaseStrategy): IntakeState {
  const state: IntakeState = {};
  for (const criterion of strategy.criteria) {
    state[criterion.name] = {};
    for (const field of criterion.fields) {
      state[criterion.name][field.name] = null;
    }
  }
  return state;
}

/** Merge newly extracted fields into an existing IntakeState (immutable). */
export function applyExtracted(
  state: IntakeState,
  extracted: Array<{ criterion_name: string; field_name: string; value: FieldValue }>
): IntakeState {
  // Deep-copy one level
  const next: IntakeState = Object.fromEntries(
    Object.entries(state).map(([k, v]) => [k, { ...v }])
  );
  for (const { criterion_name, field_name, value } of extracted) {
    if (next[criterion_name] !== undefined) {
      next[criterion_name][field_name] = value;
    }
  }
  return next;
}
