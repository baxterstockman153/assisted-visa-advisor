// app/api/chat/route.ts
// POST /api/chat  { messages: ConversationMessage[] }
//
// Accepts the full conversation history so the model can build on earlier turns
// when collecting structured criteria fields from the user.
//
// Returns:
//   { explanation: string, analysis: CriteriaAnalysis | null,
//     criteriaInstances: CriteriaInstance[], raw: string }

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { readUserVsId, readDefsVsId } from "@/lib/session";
import { CRITERIA_DEFINITIONS } from "@/lib/criteriaSchema";

// ---------------------------------------------------------------------------
// Build the criteria fields reference for the system prompt
// ---------------------------------------------------------------------------

function buildCriteriaFieldsBlock(): string {
  return CRITERIA_DEFINITIONS.map((c) => {
    const fieldLines = c.fields
      .map((f) => {
        const hint = f.hint ? ` — hint: "${f.hint}"` : "";
        return `      - ${f.name} (${f.type})${hint}`;
      })
      .join("\n");
    return (
      `  • [id: ${c.id}] ${c.name}\n` +
      `    description to infer: ${c.descriptionHint}\n` +
      `    fields:\n${fieldLines}`
    );
  }).join("\n\n");
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Ava, an O-1 extraordinary-ability visa advisor.
Your job is to help users build a strong O-1 petition by:
  1. Learning about their background through conversation and/or uploaded documents.
  2. Mapping their experience to the applicable O-1 criteria.
  3. Collecting the specific structured fields needed for each relevant criterion.
  4. Asking for anything that is still missing — conversationally, one step at a time.

⚠️  IMPORTANT: This tool is for EDUCATIONAL PURPOSES ONLY and does not constitute legal advice.

═══════════════════════════════════════════════════════════════════════════════
CONVERSATION APPROACH

Phase 1 — Understand the user
If you don't yet know the user's background, ask them to share:
  • Their current role and employer
  • Key accomplishments or projects
  • Any notable memberships, awards, or recognition
  • Uploaded documents are also a valid source — reference them via file_search

Phase 2 — Map to criteria
Use the information gathered to assess which O-1 criteria apply.

Phase 3 — Collect structured fields
For each applicable criterion, extract the required fields from what the user has shared.
If a field is missing, ask for it in a natural, conversational way — don't dump a list of
questions all at once. Prioritise the most important missing field first.

Phase 4 — Confirm and present
Once enough data is collected, present a clean summary and the database-ready instances.
═══════════════════════════════════════════════════════════════════════════════
AVAILABLE CRITERION IDs (use exactly as listed):
  O-1A:      o1a_1 (Prizes/Awards), o1a_2 (Membership), o1a_3 (Published material about you),
             o1a_4 (Judge of others), o1a_5 (Original contributions), o1a_6 (Scholarly articles),
             o1a_7 (Critical/essential role), o1a_8 (High salary)
  O-1B Arts: o1b_1 (Lead/starring in productions), o1b_2 (National/intl recognition),
             o1b_3 (Lead role for distinguished org), o1b_4 (Commercial/critical success),
             o1b_5 (Recognition from orgs/critics/experts), o1b_6 (High salary)
  O-1B MPTV: mptv (Extraordinary achievement in motion picture/television — single standard)

═══════════════════════════════════════════════════════════════════════════════
STRUCTURED CRITERIA INSTANCES

You must track four criteria categories. For each, collect fields from the user's own words
and uploaded documents. Do NOT invent or assume values.

The "description" field in each instance must be derived from what the user tells you
(e.g. "Senior Engineer at OpenAI", "Y Combinator W22", "MIT CSAIL"). Leave it null
until you have enough context from the user to fill it accurately.

Criteria categories and their fields:
${buildCriteriaFieldsBlock()}

FIELD EXTRACTION RULES:
• text fields: extract verbatim or closely paraphrased from what the user shared.
• date fields: use YYYY-MM-DD if possible; partial dates like "2022" or "March 2023" are fine.
• files fields: if the user uploaded documents, list them as ["uploaded: filename.pdf"]; for URLs use the URL string.
• files_or_urls: same as above — files or URLs, whichever the user provided.
• If a value has not been mentioned at all, set it to null.
• missing_fields: list every field name whose value is still null.
• complete: true only when ALL fields for that criterion (including description) are non-null.

ASKING FOR MISSING INFORMATION:
• At the end of your conversational response, if any criterion has missing fields, ask for
  the single most important missing piece of information across all criteria.
• Be natural — don't list all missing fields at once. Guide the user one question at a time.
• Example: "Could you tell me when you started in your current role?" rather than a bullet list.
═══════════════════════════════════════════════════════════════════════════════
RESPONSE FORMAT — follow this EXACTLY on every turn:

Write a warm, clear conversational response (2–5 sentences).
If this is the first message and you don't know the user's background yet, introduce yourself
briefly and ask them to describe their background or upload their documents.
End with a specific, single follow-up question if any criteria fields are still missing.

Then output this exact delimiter on its own line:
---JSON---

Then output a single valid JSON object (no markdown fences):
{
  "top_criteria": [
    {
      "criterion_id": "o1a_7",
      "criterion_name": "Critical or Essential Role",
      "strength": "strong",
      "rationale": "...",
      "evidence": [
        { "file_id": null, "snippet": "...", "why_it_matters": "..." }
      ],
      "gaps": ["..."],
      "next_steps": ["..."]
    }
  ],
  "other_possible_criteria": [],
  "not_supported_yet": [
    { "criterion_id": "o1a_3", "reason": "No published material found yet." }
  ],
  "classification_guess": "O-1A",
  "disclaimer": "This analysis is for educational purposes only and does not constitute legal advice. Consult a qualified immigration attorney before making any decisions.",
  "criteria_instances": [
    {
      "criteria_id": "critical_role",
      "criteria_name": "Critical Role",
      "description": null,
      "fields": {
        "start_date": null,
        "end_date": null,
        "key_responsibilities": null,
        "examples": null
      },
      "missing_fields": ["description", "start_date", "end_date", "key_responsibilities", "examples"],
      "complete": false
    },
    {
      "criteria_id": "high_remuneration",
      "criteria_name": "High Remuneration",
      "description": null,
      "fields": {
        "work_location": null,
        "salary": null,
        "paystubs": null,
        "equity_proof": null
      },
      "missing_fields": ["description", "work_location", "salary", "paystubs", "equity_proof"],
      "complete": false
    },
    {
      "criteria_id": "original_contributions",
      "criteria_name": "Original Contributions",
      "description": null,
      "fields": {
        "work_description": null,
        "impact_description": null,
        "supporting_evidence": null
      },
      "missing_fields": ["description", "work_description", "impact_description", "supporting_evidence"],
      "complete": false
    },
    {
      "criteria_id": "membership",
      "criteria_name": "Membership",
      "description": null,
      "fields": {
        "date_selected": null,
        "proof_of_membership": null
      },
      "missing_fields": ["description", "date_selected", "proof_of_membership"],
      "complete": false
    }
  ]
}

RULES:
• criteria_instances — always include ALL FOUR, even if empty. Update fields as the user
  provides more info across turns. The "description" field lives at the top level of each
  instance (not inside "fields") and should reflect the user's actual role/org.
• top_criteria — up to 3 best-supported; omit if no evidence yet.
• strength — "strong" | "medium" | "weak"
• classification_guess — "O-1A" | "O-1B (Arts)" | "O-1B (MPTV)" | "unclear"
• evidence[].file_id — real OpenAI file ID from file_search citations, or null.
• No markdown code fences around the JSON block.
═══════════════════════════════════════════════════════════════════════════════`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EvidenceItem {
  file_id: string | null;
  snippet: string;
  why_it_matters: string;
}

export interface CriterionEntry {
  criterion_id: string;
  criterion_name: string;
  strength: "strong" | "medium" | "weak";
  rationale: string;
  evidence: EvidenceItem[];
  gaps: string[];
  next_steps: string[];
}

export interface NotSupportedEntry {
  criterion_id: string;
  reason: string;
}

export interface CriteriaInstanceFields {
  [fieldName: string]: string | string[] | null;
}

export interface CriteriaInstance {
  criteria_id: string;
  criteria_name: string;
  description: string | null;
  fields: CriteriaInstanceFields;
  missing_fields: string[];
  complete: boolean;
}

export interface CriteriaAnalysis {
  top_criteria: CriterionEntry[];
  other_possible_criteria: CriterionEntry[];
  not_supported_yet: NotSupportedEntry[];
  classification_guess: string;
  disclaimer: string;
  criteria_instances: CriteriaInstance[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAnalysis(text: string): {
  explanation: string;
  analysis: CriteriaAnalysis | null;
} {
  const DELIMITER = "---JSON---";
  const idx = text.indexOf(DELIMITER);

  if (idx === -1) {
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (jsonMatch) {
      try {
        return {
          explanation: text.replace(jsonMatch[0], "").trim(),
          analysis: JSON.parse(jsonMatch[0]),
        };
      } catch {
        // fall through
      }
    }
    return { explanation: text.trim(), analysis: null };
  }

  const explanation = text.slice(0, idx).trim();
  let jsonStr = text.slice(idx + DELIMITER.length).trim();
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");

  try {
    const analysis: CriteriaAnalysis = JSON.parse(jsonStr);

    if (analysis.criteria_instances?.length) {
      console.log("\n[chat] ══ CRITERIA DATABASE INSTANCES ════════════════");
      console.log(JSON.stringify(analysis.criteria_instances, null, 2));
      console.log("[chat] ══════════════════════════════════════════════\n");
    }

    return { explanation, analysis };
  } catch (e) {
    console.warn("[chat] Failed to parse analysis JSON:", e);
    return { explanation, analysis: null };
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const userVsId = await readUserVsId();
    const defsVsId = await readDefsVsId();

    if (!userVsId) {
      return NextResponse.json(
        { error: "Session not initialised — call POST /api/init first." },
        { status: 400 }
      );
    }
    if (!defsVsId) {
      return NextResponse.json(
        {
          error:
            "Definitions vector store not ready. " +
            "Call POST /api/init first, then set DEFINITIONS_VECTOR_STORE_ID in .env.local.",
        },
        { status: 500 }
      );
    }

    // Accept either the full conversation history or a bare { message } for backwards compat
    const body = (await req.json()) as {
      messages?: ConversationMessage[];
      message?: string;
    };

    const conversationHistory: ConversationMessage[] =
      body.messages ??
      (body.message ? [{ role: "user", content: body.message }] : []);

    if (!conversationHistory.length) {
      return NextResponse.json({ error: "messages is required." }, { status: 400 });
    }

    // Build input: system prompt + full conversation history
    const input = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await openai.responses.create({
      model: "gpt-4o",
      input,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [defsVsId, userVsId],
          max_num_results: 20,
        },
      ],
    });

    const rawText: string = response.output_text ?? "";
    const { explanation, analysis } = extractAnalysis(rawText);

    return NextResponse.json({
      explanation,
      analysis,
      criteriaInstances: analysis?.criteria_instances ?? [],
      raw: rawText,
    });
  } catch (err) {
    console.error("[chat] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
