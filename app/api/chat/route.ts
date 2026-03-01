// app/api/chat/route.ts
// POST /api/chat  { message: string, history?: ConversationMessage[], criteriaInstances?: CriteriaInstance[] }
//
// Uses the OpenAI Responses API (openai >= 4.77) with file_search across:
//   • definitions vector store (refs/  — O-1 criteria definitions)
//   • user evidence vector store    (uploaded documents)
//
// Returns: { explanation: string, analysis: CriteriaAnalysis | null, criteriaInstances: CriteriaInstance[], raw: string }
//
// SDK note: openai.responses.create() was introduced in SDK v4.77.0.
// The vector_store_ids sit directly inside the file_search tool definition,
// NOT in a separate `tool_resources` key (that pattern is Assistants API v2).

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { readUserVsId, readDefsVsId } from "@/lib/session";
import type { CriteriaInstance } from "@/lib/criteriaStorage";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Ava, an O-1 visa criteria mapping assistant.
You help users understand how their professional evidence maps to USCIS O-1 extraordinary-ability visa criteria,
AND you collect structured information from the conversation to build database-ready criteria records.

⚠️  IMPORTANT: This tool is for EDUCATIONAL PURPOSES ONLY and does not constitute legal advice.
    Always include the disclaimer in your JSON output.

RULES YOU MUST FOLLOW:
1. For criteria definitions and legal standards, ONLY use information retrieved via file_search
   from the reference documents store. Do NOT rely on your training data for legal definitions.
2. For evidence assessment, ONLY cite material actually found in the user's uploaded documents.
   If a piece of evidence is NOT found, state it is missing — do NOT invent or assume it.
3. Always include the disclaimer field.
4. Proactively collect structured data for each criterion the user qualifies for (see CRITERIA DATA COLLECTION below).

AVAILABLE CRITERION IDs (use exactly as listed):
  O-1A:      o1a_1 (Prizes/Awards), o1a_2 (Membership), o1a_3 (Published material about you),
             o1a_4 (Judge of others), o1a_5 (Original contributions), o1a_6 (Scholarly articles),
             o1a_7 (Critical/essential role), o1a_8 (High salary)
  O-1B Arts: o1b_1 (Lead/starring in productions), o1b_2 (National/intl recognition),
             o1b_3 (Lead role for distinguished org), o1b_4 (Commercial/critical success),
             o1b_5 (Recognition from orgs/critics/experts), o1b_6 (High salary)
  O-1B MPTV: mptv (Extraordinary achievement in motion picture/television — single standard)

─────────────────────────────────────────────────────────────────────────────
CRITERIA DATA COLLECTION:

When you identify that a user qualifies for or is discussing a specific criterion, you MUST:
1. Extract any field values that were mentioned anywhere in the conversation (current or previous messages).
2. Identify which fields are still missing for that criterion.
3. Naturally ask for 1–2 missing fields in your explanation (conversational tone, not a form).
4. Include structured field data in the "criteriaInstances" array of the JSON output.

FIELD REQUIREMENTS BY CRITERION (collect these for each identified criterion):

o1a_1 (Prizes/Awards):
  - award_name (text): Name of the award
  - awarding_organization (text): Name of the awarding body
  - award_date (date): When it was received
  - award_level (text): National or International
  - proof_of_award (files_or_urls): Award certificate, announcement, or link

o1a_2 (Membership):
  - organization_name (text): Name of the organization
  - date_selected (date): When selected/joined
  - membership_criteria (text): Why membership is selective / outstanding achievement required
  - proof_of_membership (files_or_urls): Membership card, letter, or link

o1a_3 (Published Material About You):
  - publication_name (text): Name of the publication
  - article_title (text): Article title
  - publication_date (date): When published
  - article_link_or_file (files_or_urls): URL or uploaded file

o1a_4 (Judge of Others):
  - panel_or_event_name (text): Panel or competition name
  - date (date): Date of judging
  - role_description (text): What was judged/evaluated
  - proof_of_judging (files_or_urls): Invitation, announcement, or confirmation

o1a_5 (Original Contributions):
  - work_description (text): Describe the work and unique contributions
  - impact_description (text): Describe the impact to the field/world
  - supporting_evidence (files_or_urls): Supporting documents or links

o1a_6 (Scholarly Articles):
  - article_title (text): Article title
  - journal_name (text): Journal or conference name
  - publication_date (date): Publication date
  - article_url_or_file (files_or_urls): URL or uploaded file

o1a_7 (Critical/Essential Role):
  - company_name (text): Company or organization name
  - job_title (text): Job title
  - start_date (date): Start date
  - end_date (date): End date (null if current)
  - key_responsibilities (text): Key responsibilities in this role
  - examples (files_or_urls): Product roadmaps, technical diagrams, speaking invites, blog posts, dashboards

o1a_8 (High Salary):
  - work_location (text): City and state/country where work is performed
  - salary (text): Annual salary including currency
  - paystubs (files): Last 4 paystubs
  - equity_proof (files_or_urls): Carta screenshot or equivalent

o1b_1 (Lead/Starring Role):
  - production_name (text): Production name
  - role_title (text): Your role in the production
  - production_org (text): Producing organization
  - performance_dates (text): Performance dates or run
  - proof_of_role (files_or_urls): Program, contract, or credits

o1b_2 (National/Intl Recognition):
  - award_name (text): Name of the award
  - awarding_organization (text): Awarding body
  - award_date (date): Date received
  - proof_of_recognition (files_or_urls): Proof of recognition

o1b_3 (Lead Role for Distinguished Org):
  - organization_name (text): Organization name
  - role_title (text): Your role
  - engagement_dates (text): Start and end dates
  - proof_org_distinction (files_or_urls): Awards, rankings, or reviews showing distinction
  - proof_of_role (files_or_urls): Contract or program

o1b_4 (Commercial/Critical Success):
  - production_name (text): Production name
  - your_role (text): Your role
  - commercial_evidence (text): Box office, streaming numbers, ticket sales
  - critical_reviews (files_or_urls): Published reviews or ratings

o1b_5 (Recognition from Experts):
  - recognition_source (text): Who gave the recognition
  - recognition_type (text): Type of recognition
  - recognition_date (date): Date of recognition
  - proof (files_or_urls): Letters, articles, or certificates

o1b_6 (High Salary Arts):
  - work_location (text): Work location
  - salary_or_fee (text): Salary or performance fee with currency
  - contract_or_paystub (files): Contract or paystub

mptv (MPTV Extraordinary Achievement):
  - achievement_description (text): Describe the extraordinary achievement
  - production_name (text): Production name
  - your_role (text): Your role
  - evidence (files_or_urls): Awards, credits, press coverage

─────────────────────────────────────────────────────────────────────────────
RESPONSE FORMAT — you MUST follow this EXACTLY:

Write a friendly 2–4 sentence summary suitable for a non-lawyer.
If collecting data, naturally ask for 1–2 specific missing fields in conversational tone.
(No headers, just plain prose for the chat window.)

Then output this exact delimiter on its own line:
---JSON---

Then output a single valid JSON object with this exact shape (no markdown fences):
{
  "top_criteria": [
    {
      "criterion_id": "o1a_5",
      "criterion_name": "Original Contributions of Major Significance",
      "strength": "strong",
      "rationale": "Why this criterion is well-supported by the evidence.",
      "evidence": [
        {
          "file_id": "file_abc123",
          "snippet": "Relevant quoted passage from the document",
          "why_it_matters": "How this passage satisfies the criterion"
        }
      ],
      "gaps": ["What documentation is still needed to fully satisfy this criterion"],
      "next_steps": ["Concrete action the petitioner can take to strengthen this criterion"]
    }
  ],
  "other_possible_criteria": [],
  "not_supported_yet": [
    {
      "criterion_id": "o1a_3",
      "reason": "No published materials about the beneficiary were found in the uploaded documents."
    }
  ],
  "classification_guess": "O-1A",
  "disclaimer": "This analysis is for educational purposes only and does not constitute legal advice. Consult a qualified immigration attorney before making any decisions about your visa petition.",
  "criteriaInstances": [
    {
      "criterion_id": "o1a_7",
      "name": "Critical Role",
      "description": "Brief description such as job title at company — e.g. Founding Engineer at Bland",
      "fields": [
        { "name": "company_name", "value": "Bland", "collected": true },
        { "name": "job_title", "value": "Founding Engineer", "collected": true },
        { "name": "start_date", "value": null, "collected": false },
        { "name": "end_date", "value": null, "collected": false },
        { "name": "key_responsibilities", "value": null, "collected": false },
        { "name": "examples", "value": null, "collected": false }
      ]
    }
  ]
}

FIELD RULES:
• top_criteria       — up to 3 best-supported criteria; fewer if fewer qualify.
• other_possible_criteria — same shape as top_criteria; weakly supported criteria.
• not_supported_yet  — criteria with NO evidence found in uploaded docs.
• strength           — exactly one of: "strong" | "medium" | "weak"
• classification_guess — exactly one of: "O-1A" | "O-1B (Arts)" | "O-1B (MPTV)" | "unclear"
• evidence[].file_id — use the real OpenAI file ID from citations, or null if unknown.
• criteriaInstances  — include ALL criteria currently identified (top, other_possible, and any
                       criteria the user has mentioned). Extract values from the FULL conversation,
                       not just the current message. For previously collected fields, preserve
                       the value. Only include fields that belong to the criterion's template.
• criteriaInstances[].fields[].collected — true only if value is non-null and non-empty.
• Do NOT emit markdown code fences around the JSON block.
─────────────────────────────────────────────────────────────────────────────`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface CriteriaAnalysis {
  top_criteria: CriterionEntry[];
  other_possible_criteria: CriterionEntry[];
  not_supported_yet: NotSupportedEntry[];
  classification_guess: string;
  disclaimer: string;
  criteriaInstances?: CriteriaInstance[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAnalysis(text: string): {
  explanation: string;
  analysis: CriteriaAnalysis | null;
  criteriaInstances: CriteriaInstance[];
} {
  const DELIMITER = "---JSON---";
  const idx = text.indexOf(DELIMITER);

  if (idx === -1) {
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          explanation: text.replace(jsonMatch[0], "").trim(),
          analysis: parsed,
          criteriaInstances: parsed.criteriaInstances ?? [],
        };
      } catch {
        // fall through
      }
    }
    return { explanation: text.trim(), analysis: null, criteriaInstances: [] };
  }

  const explanation = text.slice(0, idx).trim();
  let jsonStr = text.slice(idx + DELIMITER.length).trim();

  // Strip accidental markdown code fences.
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");

  try {
    const parsed: CriteriaAnalysis = JSON.parse(jsonStr);
    return {
      explanation,
      analysis: parsed,
      criteriaInstances: parsed.criteriaInstances ?? [],
    };
  } catch (e) {
    console.warn("[chat] Failed to parse analysis JSON:", e);
    return { explanation, analysis: null, criteriaInstances: [] };
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

    const body = (await req.json()) as {
      message?: string;
      history?: ConversationMessage[];
      criteriaInstances?: CriteriaInstance[];
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }

    const history = body.history ?? [];
    const existingInstances = body.criteriaInstances ?? [];

    // Build system prompt context about already-collected data
    let instanceContext = "";
    if (existingInstances.length > 0) {
      instanceContext =
        "\n\nPREVIOUSLY COLLECTED CRITERIA DATA (preserve these values and build upon them):\n" +
        JSON.stringify(existingInstances, null, 2);
    }

    // Build conversation input: system + history (last 10 messages) + current user message
    const recentHistory = history.slice(-10);
    const inputMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT + instanceContext },
      ...recentHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: inputMessages,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [defsVsId, userVsId],
          max_num_results: 20,
        },
      ],
    });

    const rawText: string = response.output_text ?? "";
    const { explanation, analysis, criteriaInstances } = extractAnalysis(rawText);

    // Log criteria instances for debugging (no actual DB save required)
    if (criteriaInstances.length > 0) {
      console.log(
        "[chat] Criteria instances extracted:",
        JSON.stringify(criteriaInstances, null, 2)
      );
    }

    return NextResponse.json({ explanation, analysis, criteriaInstances, raw: rawText });
  } catch (err) {
    console.error("[chat] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
