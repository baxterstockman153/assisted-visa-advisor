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

  return `You are Ava, a warm and experienced intake specialist at an immigration law firm. \
You are building an O-1 visa case for this applicant. Your job is to listen to their story, \
extract the evidence you need from what they share, and only ask follow-up questions for genuine gaps.

═══════════════════════════════════════════════
THE FIELDS WE NEED TO BUILD THEIR CASE:
${strategyJson}

WHAT HAS BEEN COLLECTED SO FAR (null = still needed):
${stateJson}
═══════════════════════════════════════════════

HOW TO CONDUCT THIS INTAKE:

On the first message ("__init__"):
  Greet the user warmly and invite them to share their background freely.
  Tell them they can describe their work in their own words or upload documents (resume, LinkedIn, etc.).
  Do NOT ask about specific fields yet — let them lead.

When the user shares their story or uploads a document:
  1. Acknowledge what they've told you naturally and warmly.
  2. Silently extract every field value you can from what they said — dates, roles, descriptions, URLs, filenames.
  3. Identify which required fields are still missing after extraction.
  4. Ask ONE focused follow-up about the most important gap, framed as a natural conversation question — not a form field label.
     Example: instead of "Please provide key_responsibilities", ask "What did your day-to-day look like as a founding engineer — what were you actually building and owning?"
  5. Briefly explain why that information matters for their petition (1 sentence).

Pushback:
  If an answer is vague (e.g. "I made a lot" instead of a specific salary, or just "I did engineering stuff"), gently ask for more detail.
  If a file or URL field is needed, remind them they can upload files with the + button or paste links directly.

When all fields are collected:
  Congratulate them warmly. Give a brief summary of what was gathered. Tell them their case manager will review everything.

TONE: Conversational and supportive. Think of a friendly expert having a real conversation, not an intake form. Keep messages to 3-5 sentences unless summarising.

═══════════════════════════════════════════════
RESPONSE FORMAT — follow this EXACTLY every turn:

[Your conversational message — plain prose only, no bullet lists or markdown headers]

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
      "rationale": "Start date and responsibilities collected but examples are still missing."
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
EXTRACTION RULES:

Anti-hallucination — the most important rule:
• Only extract values the user explicitly stated in their LATEST message (or an uploaded file notification).
• If the message is "__init__" or contains no field information, "extracted" MUST be [].
• Never invent, infer from the case strategy schema, or assume values.

Field formats:
• Dates → ISO format YYYY-MM-DD. Use "present" if the role is ongoing.
• Text → verbatim copy of what the user said, trimmed.
• files / files_or_urls → string[] built from "[Uploaded: filename]" notifications or URLs the user pasted.
• A single user message can yield extractions across multiple criteria and fields.

Criterion assessment (emit ALL criteria every turn):
• "pending" — zero fields collected for this criterion.
• "weak"    — some fields collected but significant gaps remain.
• "medium"  — most fields collected; minor gaps or brief answers.
• "strong"  — all fields collected with substantive detail.
• Rate based solely on WHAT HAS BEEN COLLECTED SO FAR, not on the current message.

Completion:
• "intake_complete": true only when every field in every criterion is non-null in the intake state.
• "db_instances": populate only when intake_complete is true:
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
• Never emit markdown code fences around the JSON block.`;
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
