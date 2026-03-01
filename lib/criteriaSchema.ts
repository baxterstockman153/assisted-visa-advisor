// lib/criteriaSchema.ts
// Defines the structured field requirements for each O-1 visa criterion category.
//
// IMPORTANT: The `description` on each definition is a hint for the bot — it tells
// the bot *what kind* of context to look for in the user's story. The actual
// description saved in a CriteriaInstance (e.g. "Senior Engineer at OpenAI") is
// derived dynamically from what the user shares, not hardcoded here.

export type FieldType = "date" | "text" | "files" | "files_or_urls";

export interface CriteriaField {
  name: string;
  type: FieldType;
  hint?: string;
}

export interface CriteriaDefinition {
  id: string;
  name: string;
  /** Shown in the UI as a sub-label. Tells the bot what kind of description to infer. */
  descriptionHint: string;
  fields: CriteriaField[];
}

/** The four criteria categories we collect structured data for. */
export const CRITERIA_DEFINITIONS: CriteriaDefinition[] = [
  {
    id: "critical_role",
    name: "Critical Role",
    descriptionHint: "The specific role / position held (e.g. 'CTO at Acme Inc')",
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
    id: "high_remuneration",
    name: "High Remuneration",
    descriptionHint: "The role / employer for which remuneration is being documented",
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
    id: "original_contributions",
    name: "Original Contributions",
    descriptionHint: "The organisation / field where the original contributions were made",
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
    id: "membership",
    name: "Membership",
    descriptionHint: "The distinguished organisation the user is a member of (e.g. 'Y Combinator', 'National Academy of Sciences')",
    fields: [
      { name: "date_selected", type: "date" },
      { name: "proof_of_membership", type: "files_or_urls" },
    ],
  },
];

/** Flat label for a field name — used in prompts and UI display. */
export function fieldLabel(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human-readable field type description. */
export function fieldTypeLabel(type: FieldType): string {
  const map: Record<FieldType, string> = {
    date: "date (YYYY-MM-DD)",
    text: "text",
    files: "uploaded file(s)",
    files_or_urls: "uploaded file(s) or URL(s)",
  };
  return map[type];
}
