# O-1 Visa Advisor — "Ava"

An AI-powered intake chatbot that helps applicants understand how their achievements map to O-1 visa criteria, while quietly collecting the structured data a paralegal needs to start building a petition.

---

## The core idea

The O-1 visa process is intimidating. Most applicants don't know which of the eight criteria they qualify for, and traditional intake forms front-load that confusion — you're asked to classify yourself before you even understand what you're being classified by.

**The bet here is that conversation is a better intake mechanism than a form.**

Ava asks for nothing upfront. The user just describes their background in plain language — the same way they'd explain it to a friend. From there, Ava maps what they've shared to the relevant O-1A/O-1B criteria, tells them which are their strongest, and naturally asks follow-up questions to fill in any gaps. The data collection happens as a byproduct of a helpful conversation, not as a bureaucratic exercise.

This matters for two reasons:
1. **Reduce anxiety** — a stressed applicant is more forthcoming when they feel like they're being helped, not interrogated.
2. **Better data quality** — conversational context surfaces nuance that checkbox forms miss entirely.

---

## How it works

**1. Chat with Ava**
The user describes their background or uploads supporting documents (resume, papers, press coverage, etc.). No structured input required.

**2. Real-time criteria mapping**
Each message is processed by GPT-4o with RAG over two vector stores: one containing official O-1 criteria definitions, one containing the user's own uploaded documents. Ava responds in plain English and identifies which criteria the user's evidence supports, with a strength rating (strong / medium / weak) and specific next steps.

**3. Structured data collection in the background**
As Ava identifies relevant criteria, she extracts structured field values — dates, company names, award details, salary figures — from the conversation and populates them into a "Data Collected" panel in the sidebar. She asks for missing fields conversationally, not via a form.

**4. Paralegal review**
The collected criteria instances (with all fields and completion status) are accumulated in state throughout the session. The intent is for this to be saved server-side so a paralegal can open a dashboard, see exactly what's been gathered for each criterion, and know precisely what's still missing — without having to re-read the full conversation transcript.

---

## UI layout

```
┌─────────────────────┬────────────────────────────────────┐
│  Assessment         │                                    │
│  ─────────────────  │        Chat with Ava               │
│  Criteria cards:    │                                    │
│  • Strong           │  [User describes background]       │
│  • Medium           │  [Ava responds + asks questions]   │
│  • Weak / missing   │  [User uploads docs]               │
│                     │                                    │
│  [What We Need Next]│                                    │
│─────────────────────│                                    │
│  Data Collected     │  + [attach]  [type here]  [Send]  │
│  ─────────────────  │                                    │
│  Per-criterion      │                                    │
│  field completion   │                                    │
└─────────────────────┴────────────────────────────────────┘
```

The sidebar has two tabs. **Assessment** shows the live criteria analysis after each message. **Data Collected** shows structured field values being filled in — the paralegal-ready output.

---

## Stack

- **Next.js 15** (App Router, server components where possible)
- **OpenAI Responses API** with `file_search` tool for RAG
- Two vector stores: O-1 criteria definitions (pre-seeded) + per-session user evidence

---

## What's not built yet

This is a proof of concept. Some things were left out intentionally:

- **No persistence** — criteria data lives in React state; refreshing loses everything. A real version would save sessions to a database.
- **No paralegal dashboard** — the structured data is collected but there's no separate UI for paralegals to review and act on it.
- **No auth** — any user can access the app. Production would need login and session isolation.
- **Edge cases** — the criteria templates cover the main O-1A and O-1B tracks but not every scenario. Unusual profiles may get incomplete analysis.
- **No citation rendering** — Ava references uploaded documents internally but the UI doesn't surface clickable citations yet.
- **No export** — there's no way to download the collected criteria data as a PDF or structured file.

---

## What I'd do differently with more time

- Save sessions server-side so the paralegal can access them asynchronously
- Add a paralegal-facing review UI with edit capabilities and a "ready for attorney" handoff state
- Stream Ava's responses for a faster-feeling experience
- Render structured criteria analysis inline in the chat (not just in the sidebar), so the user sees exactly what's being built
- Add a progress indicator so users know how complete their case profile is
- Citation rendering — both to ground Ava's analysis in verifiable source material and to make paralegal review faster and more auditable. 
- Contextual help links — surface relevant internal guides or external USCIS resources inline, so applicants can go deeper on any criterion without leaving the conversation.