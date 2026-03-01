// lib/criteriaSchema.ts
// Defines the structured field requirements for each O-1 visa criterion.
// The bot uses these definitions to know what information to collect from the user,
// and to produce database-ready instances once all fields are gathered.

export type FieldType = "date" | "text" | "files" | "files_or_urls";

export interface CriteriaField {
  name: string;
  type: FieldType;
  hint?: string;
}

export interface CriteriaDefinition {
  id: string;
  name: string;
  description: string;
  fields: CriteriaField[];
}

/** The four criteria we need structured data for, with their required fields. */
export const CRITERIA_DEFINITIONS: CriteriaDefinition[] = [
  {
    id: "critical_role",
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
    id: "high_remuneration",
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
    id: "original_contributions",
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
    id: "membership",
    name: "Membership",
    description: "Y Combinator",
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
