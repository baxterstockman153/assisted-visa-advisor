// app/api/chat/route.ts
// POST /api/chat  { message: string, history: HistoryItem[], intakeState: IntakeState }
//
// Drives a conversational intake session. The model knows the full case
// strategy and what has already been collected; it asks for missing fields
// one at a time, validates answers, and — when everything is gathered —
// emits structured DB-ready instances.
//
// Response: { message, extracted, intakeComplete, dbInstances, error? }

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { CASE_STRATEGY, IntakeState, FieldValue } from "@/lib/caseStrategy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedField {
  criterion_name: string;
  field_name: string;
  value: FieldValue;
}

export interface DbCriterionRecord {
  criterion: string;
  description: string;
  fields: Record<string, FieldValue>;
}

export interface CriterionAssessment {
  criterion_name: string;
  strength: "strong" | "medium" | "weak" | "pending";
  rationale: string;
}

export interface IntakeChatResponse {
  message: string;
  extracted: ExtractedField[];
  criterionAssessment: CriterionAssessment[];
  intakeComplete: boolean;
  dbInstances: DbCriterionRecord[] | null;
}

export interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// System prompt (built dynamically so it reflects the live intakeState)
// ---------------------------------------------------------------------------

function buildSystemPrompt(intakeState: IntakeState): string {
  const strategyJson = JSON.stringify(CASE_STRATEGY, null, 2);
  const stateJson = JSON.stringify(intakeState, null, 2);

  return `You are Ava, a warm and knowledgeable intake specialist at an immigration law firm. \
Your job is to guide this O-1 visa applicant through providing the exact information their attorney needs for their petition.

═══════════════════════════════════════════════
CASE STRATEGY (the fields you must collect):
${strategyJson}

CURRENT INTAKE STATE (null = not yet provided):
${stateJson}
═══════════════════════════════════════════════

YOUR TASK:
1. Scan the CURRENT INTAKE STATE for any field that is still null.
2. Ask for the next missing field (or a small logical group, e.g. start/end dates together).
3. When asking, briefly explain WHY the attorney needs this specific piece of information (1-2 sentences).
4. When the user provides information, acknowledge it warmly, then immediately move to the next missing field.
5. For "files" or "files_or_urls" fields: tell the user they can upload files using the + button below the chat, or paste URLs directly in their message. Accept filenames that appear in the conversation as confirmation of upload.
6. If the user's message is "__init__", introduce yourself briefly and jump straight into asking for the first missing field.
7. If the user provides an answer that seems vague or insufficient (e.g. no dates, unclear salary), gently push back and ask them to be more specific.
8. When ALL fields across ALL criteria are collected (no nulls remain in the intake state), congratulate the user warmly and tell them their case manager will review the submission.

TONE: Warm, supportive, and clear. The user may be stressed. Keep messages concise — 2-4 sentences for questions, 1-2 sentences for acknowledgements.

═══════════════════════════════════════════════
RESPONSE FORMAT — follow this EXACTLY:

[Your conversational message — plain prose, no markdown headers or bullet lists]

---JSON---
{
  "extracted": [
    {
      "criterion_name": "Critical Role",
      "field_name": "start_date",
      "value": "2022-03-01"
    }
  ],
  "criterion_assessment": [
    {
      "criterion_name": "Critical Role",
      "strength": "weak",
      "rationale": "Start date provided but key responsibilities and examples are still missing."
    },
    {
      "criterion_name": "High Remuneration",
      "strength": "pending",
      "rationale": "No information collected yet."
    }
  ],
  "intake_complete": false,
  "db_instances": null
}

═══════════════════════════════════════════════
EXTRACTION RULES — read carefully:

ANTI-HALLUCINATION (most important rule):
• "extracted" MUST only contain values the user explicitly stated in their LATEST message.
• If the message is "__init__" or does not contain a direct answer to a field question, "extracted" MUST be []. Never invent, infer, or assume values.
• Do NOT pre-fill fields based on the company/role names in the case strategy. Wait for the user to provide them.

Field extraction:
• Dates → ISO format YYYY-MM-DD, or the string "present" if the role is ongoing.
• Text → copy the user's answer verbatim (trimmed).
• files / files_or_urls → string[] of filenames and/or full URLs. Parse filenames only from upload notifications like "[Uploaded: paystub.pdf]" or explicit URL pastes in the message.

Criterion assessment (include ALL criteria every turn):
• "pending" — no fields have been collected for this criterion yet.
• "weak"    — 1 or more fields collected but significant information is still missing.
• "medium"  — most fields collected; minor gaps or brief answers remain.
• "strong"  — all fields collected with substantive, detailed responses.
• Base the rating solely on values already in CURRENT INTAKE STATE, not on what the user just said.

Completion:
• "intake_complete": true ONLY when every field in every criterion has a non-null value in the intake state.
• "db_instances": populate ONLY when intake_complete is true, using this shape:
  [
    {
      "criterion": "Critical Role",
      "description": "Founding Engineer at Bland",
      "fields": {
        "start_date": "2022-03-01",
        "end_date": "present",
        "key_responsibilities": "Led architecture of the voice AI platform...",
        "examples": ["roadmap.pdf", "https://blog.example.com/post"]
      }
    }
  ]
• Do NOT emit markdown code fences around the JSON block.`;
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

function parseIntakeResponse(raw: string): {
  message: string;
  extracted: ExtractedField[];
  criterionAssessment: CriterionAssessment[];
  intakeComplete: boolean;
  dbInstances: DbCriterionRecord[] | null;
} {
  const DELIM = "---JSON---";
  const idx = raw.indexOf(DELIM);

  const empty = { message: raw.trim(), extracted: [], criterionAssessment: [], intakeComplete: false, dbInstances: null };

  if (idx === -1) return empty;

  const message = raw.slice(0, idx).trim();
  let jsonStr = raw.slice(idx + DELIM.length).trim();
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");

  try {
    const parsed = JSON.parse(jsonStr) as {
      extracted: ExtractedField[];
      criterion_assessment: CriterionAssessment[];
      intake_complete: boolean;
      db_instances: DbCriterionRecord[] | null;
    };
    return {
      message,
      extracted: parsed.extracted ?? [],
      criterionAssessment: parsed.criterion_assessment ?? [],
      intakeComplete: parsed.intake_complete ?? false,
      dbInstances: parsed.db_instances ?? null,
    };
  } catch (e) {
    console.warn("[chat] Failed to parse intake JSON:", e);
    return { ...empty, message };
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: HistoryItem[];
      intakeState?: IntakeState;
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }

    const history: HistoryItem[] = body.history ?? [];
    const intakeState: IntakeState = body.intakeState ?? {};

    const systemPrompt = buildSystemPrompt(intakeState);

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        { role: "system", content: systemPrompt },
        // Replay conversation history so the model has full context
        ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message },
      ],
    });

    const rawText: string = response.output_text ?? "";
    const result = parseIntakeResponse(rawText);

    // Surface complete DB instances to the server console as well
    if (result.intakeComplete && result.dbInstances) {
      console.log("\n════════════════════════════════════════");
      console.log("INTAKE COMPLETE — DB instances ready:");
      console.log(JSON.stringify(result.dbInstances, null, 2));
      console.log("════════════════════════════════════════\n");
    }

    return NextResponse.json(result as IntakeChatResponse);
  } catch (err) {
    console.error("[chat] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
