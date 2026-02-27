// app/api/chat/route.ts
// POST /api/chat  { message: string }
//
// Uses the OpenAI Responses API (openai >= 4.77) with file_search across:
//   • definitions vector store (refs/  — O-1 criteria definitions)
//   • user evidence vector store    (uploaded documents)
//
// Returns: { explanation: string, analysis: CriteriaAnalysis | null, raw: string }
//
// SDK note: openai.responses.create() was introduced in SDK v4.77.0.
// The vector_store_ids sit directly inside the file_search tool definition,
// NOT in a separate `tool_resources` key (that pattern is Assistants API v2).

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { readUserVsId, readDefsVsId } from "@/lib/session";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an O-1 visa criteria mapping assistant.
You help users understand how their professional evidence maps to USCIS O-1 extraordinary-ability visa criteria.

⚠️  IMPORTANT: This tool is for EDUCATIONAL PURPOSES ONLY and does not constitute legal advice.
    Always include the disclaimer in your JSON output.

RULES YOU MUST FOLLOW:
1. For criteria definitions and legal standards, ONLY use information retrieved via file_search
   from the reference documents store. Do NOT rely on your training data for legal definitions.
2. For evidence assessment, ONLY cite material actually found in the user's uploaded documents.
   If a piece of evidence is NOT found, state it is missing — do NOT invent or assume it.
3. Always include the disclaimer field.

AVAILABLE CRITERION IDs (use exactly as listed):
  O-1A:      o1a_1 (Prizes/Awards), o1a_2 (Membership), o1a_3 (Published material about you),
             o1a_4 (Judge of others), o1a_5 (Original contributions), o1a_6 (Scholarly articles),
             o1a_7 (Critical/essential role), o1a_8 (High salary)
  O-1B Arts: o1b_1 (Lead/starring in productions), o1b_2 (National/intl recognition),
             o1b_3 (Lead role for distinguished org), o1b_4 (Commercial/critical success),
             o1b_5 (Recognition from orgs/critics/experts), o1b_6 (High salary)
  O-1B MPTV: mptv (Extraordinary achievement in motion picture/television — single standard)

─────────────────────────────────────────────────────────────────────────────
RESPONSE FORMAT — you MUST follow this EXACTLY:

Write a friendly 2–4 sentence summary suitable for a non-lawyer.
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
  "disclaimer": "This analysis is for educational purposes only and does not constitute legal advice. Consult a qualified immigration attorney before making any decisions about your visa petition."
}

FIELD RULES:
• top_criteria       — up to 3 best-supported criteria; fewer if fewer qualify.
• other_possible_criteria — same shape as top_criteria; weakly supported criteria.
• not_supported_yet  — criteria with NO evidence found in uploaded docs.
• strength           — exactly one of: "strong" | "medium" | "weak"
• classification_guess — exactly one of: "O-1A" | "O-1B (Arts)" | "O-1B (MPTV)" | "unclear"
• evidence[].file_id — use the real OpenAI file ID from citations, or null if unknown.
• Do NOT emit markdown code fences around the JSON block.
─────────────────────────────────────────────────────────────────────────────`;

// ---------------------------------------------------------------------------
// Helpers
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
}

function extractAnalysis(text: string): {
  explanation: string;
  analysis: CriteriaAnalysis | null;
} {
  const DELIMITER = "---JSON---";
  const idx = text.indexOf(DELIMITER);

  if (idx === -1) {
    // Delimiter missing — try to extract any JSON object as a fallback.
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (jsonMatch) {
      try {
        return { explanation: text.replace(jsonMatch[0], "").trim(), analysis: JSON.parse(jsonMatch[0]) };
      } catch {
        // fall through
      }
    }
    return { explanation: text.trim(), analysis: null };
  }

  const explanation = text.slice(0, idx).trim();
  let jsonStr = text.slice(idx + DELIMITER.length).trim();

  // Strip any accidental markdown code fences.
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");

  try {
    const analysis: CriteriaAnalysis = JSON.parse(jsonStr);
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

    const body = (await req.json()) as { message?: string };
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }

    // ------------------------------------------------------------------
    // OpenAI Responses API  (SDK >= 4.77)
    // file_search vector_store_ids live inside the tool definition,
    // not in a separate tool_resources key.
    // ------------------------------------------------------------------
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
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

    return NextResponse.json({ explanation, analysis, raw: rawText });
  } catch (err) {
    console.error("[chat] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
