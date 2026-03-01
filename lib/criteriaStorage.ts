// lib/criteriaStorage.ts
// Defines the schema for structured criteria data collection.
// Each criterion has a set of required fields that Ava collects during conversation.

export type FieldType = "text" | "date" | "files" | "files_or_urls";

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  hint?: string;
}

export interface CriterionTemplate {
  criterion_id: string;
  name: string;
  fields: FieldDefinition[];
}

export interface FieldValue extends FieldDefinition {
  value: string | null;
  collected: boolean;
}

export interface CriteriaInstance {
  criterion_id: string;
  name: string;
  description: string; // e.g. "Founding Engineer at Bland"
  fields: FieldValue[];
}

// ---------------------------------------------------------------------------
// Templates — one per criterion ID
// ---------------------------------------------------------------------------

export const CRITERIA_TEMPLATES: Record<string, CriterionTemplate> = {
  o1a_1: {
    criterion_id: "o1a_1",
    name: "Prizes / Awards",
    fields: [
      { name: "award_name", label: "Award Name", type: "text" },
      { name: "awarding_organization", label: "Awarding Organization", type: "text" },
      { name: "award_date", label: "Date Received", type: "date" },
      {
        name: "award_level",
        label: "Award Level",
        type: "text",
        hint: "National or International",
      },
      {
        name: "proof_of_award",
        label: "Proof of Award",
        type: "files_or_urls",
        hint: "Award certificate, announcement, or link",
      },
    ],
  },

  o1a_2: {
    criterion_id: "o1a_2",
    name: "Membership in Distinguished Associations",
    fields: [
      { name: "organization_name", label: "Organization Name", type: "text" },
      { name: "date_selected", label: "Date Selected / Joined", type: "date" },
      {
        name: "membership_criteria",
        label: "Selection Criteria",
        type: "text",
        hint: "Why is membership selective / outstanding achievement required?",
      },
      {
        name: "proof_of_membership",
        label: "Proof of Membership",
        type: "files_or_urls",
        hint: "Membership card, letter, or link",
      },
    ],
  },

  o1a_3: {
    criterion_id: "o1a_3",
    name: "Published Material About You",
    fields: [
      { name: "publication_name", label: "Publication Name", type: "text" },
      { name: "article_title", label: "Article Title", type: "text" },
      { name: "publication_date", label: "Publication Date", type: "date" },
      {
        name: "article_link_or_file",
        label: "Article URL or File",
        type: "files_or_urls",
      },
    ],
  },

  o1a_4: {
    criterion_id: "o1a_4",
    name: "Judge of Others' Work",
    fields: [
      { name: "panel_or_event_name", label: "Panel / Competition Name", type: "text" },
      { name: "date", label: "Date", type: "date" },
      {
        name: "role_description",
        label: "Role Description",
        type: "text",
        hint: "What did you judge or evaluate?",
      },
      {
        name: "proof_of_judging",
        label: "Proof",
        type: "files_or_urls",
        hint: "Invitation, announcement, or confirmation",
      },
    ],
  },

  o1a_5: {
    criterion_id: "o1a_5",
    name: "Original Contributions",
    fields: [
      {
        name: "work_description",
        label: "Work Description",
        type: "text",
        hint: "Describe your work and unique contributions",
      },
      {
        name: "impact_description",
        label: "Impact Description",
        type: "text",
        hint: "Describe the impact to the field/world",
      },
      { name: "supporting_evidence", label: "Supporting Evidence", type: "files_or_urls" },
    ],
  },

  o1a_6: {
    criterion_id: "o1a_6",
    name: "Scholarly Articles",
    fields: [
      { name: "article_title", label: "Article Title", type: "text" },
      { name: "journal_name", label: "Journal / Conference Name", type: "text" },
      { name: "publication_date", label: "Publication Date", type: "date" },
      {
        name: "article_url_or_file",
        label: "Article URL or File",
        type: "files_or_urls",
      },
    ],
  },

  o1a_7: {
    criterion_id: "o1a_7",
    name: "Critical Role",
    fields: [
      { name: "company_name", label: "Company / Organization Name", type: "text" },
      { name: "job_title", label: "Job Title", type: "text" },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date", hint: "Leave blank if current" },
      { name: "key_responsibilities", label: "Key Responsibilities", type: "text" },
      {
        name: "examples",
        label: "Examples",
        type: "files_or_urls",
        hint: "Product roadmaps, technical diagrams, speaking invites, blog posts, dashboards showing project ownership",
      },
    ],
  },

  o1a_8: {
    criterion_id: "o1a_8",
    name: "High Remuneration",
    fields: [
      { name: "work_location", label: "Work Location", type: "text" },
      { name: "salary", label: "Salary", type: "text", hint: "Include currency" },
      {
        name: "paystubs",
        label: "Paystubs",
        type: "files",
        hint: "Last 4 paystubs",
      },
      {
        name: "equity_proof",
        label: "Equity Proof",
        type: "files_or_urls",
        hint: "Carta screenshot or equivalent",
      },
    ],
  },

  o1b_1: {
    criterion_id: "o1b_1",
    name: "Lead / Starring Role",
    fields: [
      { name: "production_name", label: "Production Name", type: "text" },
      { name: "role_title", label: "Your Role", type: "text" },
      { name: "production_org", label: "Production Organization", type: "text" },
      { name: "performance_dates", label: "Performance Dates", type: "text" },
      {
        name: "proof_of_role",
        label: "Proof of Role",
        type: "files_or_urls",
        hint: "Program, contract, or credits",
      },
    ],
  },

  o1b_2: {
    criterion_id: "o1b_2",
    name: "National / International Recognition",
    fields: [
      { name: "award_name", label: "Award Name", type: "text" },
      { name: "awarding_organization", label: "Awarding Organization", type: "text" },
      { name: "award_date", label: "Award Date", type: "date" },
      { name: "proof_of_recognition", label: "Proof of Recognition", type: "files_or_urls" },
    ],
  },

  o1b_3: {
    criterion_id: "o1b_3",
    name: "Lead Role for Distinguished Organization",
    fields: [
      { name: "organization_name", label: "Organization Name", type: "text" },
      { name: "role_title", label: "Your Role", type: "text" },
      { name: "engagement_dates", label: "Dates", type: "text" },
      {
        name: "proof_org_distinction",
        label: "Org Distinction Proof",
        type: "files_or_urls",
        hint: "Awards, rankings, reviews",
      },
      {
        name: "proof_of_role",
        label: "Your Role Proof",
        type: "files_or_urls",
        hint: "Contract or program",
      },
    ],
  },

  o1b_4: {
    criterion_id: "o1b_4",
    name: "Commercial / Critical Success",
    fields: [
      { name: "production_name", label: "Production Name", type: "text" },
      { name: "your_role", label: "Your Role", type: "text" },
      {
        name: "commercial_evidence",
        label: "Commercial Evidence",
        type: "text",
        hint: "Box office numbers, streaming stats, ticket sales",
      },
      {
        name: "critical_reviews",
        label: "Critical Reviews",
        type: "files_or_urls",
        hint: "Published reviews or ratings",
      },
    ],
  },

  o1b_5: {
    criterion_id: "o1b_5",
    name: "Recognition from Organizations / Critics",
    fields: [
      { name: "recognition_source", label: "Recognition Source", type: "text" },
      { name: "recognition_type", label: "Type of Recognition", type: "text" },
      { name: "recognition_date", label: "Date", type: "date" },
      {
        name: "proof",
        label: "Proof",
        type: "files_or_urls",
        hint: "Letters, articles, or certificates",
      },
    ],
  },

  o1b_6: {
    criterion_id: "o1b_6",
    name: "High Salary (Arts)",
    fields: [
      { name: "work_location", label: "Work Location", type: "text" },
      {
        name: "salary_or_fee",
        label: "Salary / Performance Fee",
        type: "text",
        hint: "Include currency",
      },
      { name: "contract_or_paystub", label: "Contract or Paystub", type: "files" },
    ],
  },

  mptv: {
    criterion_id: "mptv",
    name: "Extraordinary Achievement (MPTV)",
    fields: [
      { name: "achievement_description", label: "Achievement Description", type: "text" },
      { name: "production_name", label: "Production Name", type: "text" },
      { name: "your_role", label: "Your Role", type: "text" },
      {
        name: "evidence",
        label: "Evidence",
        type: "files_or_urls",
        hint: "Awards, credits, press coverage",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Helper: build an empty instance from a template
// ---------------------------------------------------------------------------

export function buildEmptyInstance(
  criterionId: string,
  description = ""
): CriteriaInstance | null {
  const template = CRITERIA_TEMPLATES[criterionId];
  if (!template) return null;

  return {
    criterion_id: criterionId,
    name: template.name,
    description,
    fields: template.fields.map((f) => ({ ...f, value: null, collected: false })),
  };
}

// ---------------------------------------------------------------------------
// Helper: merge newly extracted field values into existing instances
// ---------------------------------------------------------------------------

export function mergeInstances(
  existing: CriteriaInstance[],
  incoming: CriteriaInstance[]
): CriteriaInstance[] {
  const map = new Map<string, CriteriaInstance>(existing.map((i) => [i.criterion_id, i]));

  for (const inc of incoming) {
    const ex = map.get(inc.criterion_id);
    if (!ex) {
      map.set(inc.criterion_id, inc);
    } else {
      // Merge: update fields where incoming has a non-null collected value
      const mergedFields = ex.fields.map((exField) => {
        const incField = inc.fields.find((f) => f.name === exField.name);
        if (incField && incField.collected && incField.value !== null) {
          return { ...exField, value: incField.value, collected: true };
        }
        return exField;
      });
      // Use incoming description if it's more specific
      const description = inc.description || ex.description;
      map.set(inc.criterion_id, { ...ex, description, fields: mergedFields });
    }
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Helper: compute completion percentage for an instance
// ---------------------------------------------------------------------------

export function completionPercent(instance: CriteriaInstance): number {
  if (instance.fields.length === 0) return 100;
  const collected = instance.fields.filter((f) => f.collected).length;
  return Math.round((collected / instance.fields.length) * 100);
}
