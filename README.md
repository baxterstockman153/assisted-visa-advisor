# O-1 Visa Onboarding Advisor

A proof-of-concept onboarding tool that replaces the traditional immigration data intake process — long forms, confusing emails, and phone calls — with a guided, conversational experience.

---

## The Problem

Collecting evidence for an O-1 visa case is inherently stressful. Applicants are typically smart, accomplished people who have no familiarity with immigration law. They're handed a checklist of documents they don't understand, asked to self-report information about "extraordinary ability," and expected to produce polished evidence packets with little guidance on what "good" actually looks like.

The existing playbook — long explanatory text blocks, email follow-ups, intake calls — doesn't scale and doesn't stick. Users skim, miss things, and still show up unprepared. Case managers spend significant time on rework that should have been caught at intake.

---

## The Approach: Start With a Conversation

The core design decision here is that **the right interface for this problem is a conversation, not a form.**

A form puts the cognitive burden on the user: they have to understand each field, know what counts as valid evidence, and navigate the blank page problem of writing about their own achievements. Most people find this paralyzing, especially for something as high-stakes as a visa application.

A conversation shifts that burden. The user just talks. They describe their background, their role, their work — the way they'd explain it to a colleague, not a government form. Ava, the AI assistant, handles the structure behind the scenes. She knows which criteria are relevant to this case, what evidence would be persuasive for each one, and which follow-up questions will surface the most useful information.

This isn't just about comfort. It produces better data. When a user is asked to "describe your work at Bland," they surface context, nuance, and evidence that a form field labeled "key_responsibilities" would never capture. Ava can then ask the right follow-up — "you mentioned you led the API team, were you responsible for hiring decisions?" — in a way a static form cannot.

---

## How It Works

### 1. Case Strategy Drives Everything

Before a session begins, the paralegal team has already assessed the applicant and determined a **case strategy** — the set of O-1 criteria they're best positioned to satisfy. For example:

- Critical Role — Founding Engineer at Bland
- High Remuneration — Founding Engineer at Bland
- Original Contributions — Bland
- Membership — Y Combinator

This strategy is loaded into the app and determines exactly what Ava needs to collect. Different applicants get different conversations. A founding engineer's session looks nothing like a research scientist's or a musician's, because the underlying criteria and evidence types differ. The conversation adapts to the case, not the other way around.

### 2. Evidence Upload (Optional, Low-Friction)

Users can optionally upload supporting documents at any point — a resume, a LinkedIn export, paystubs, a Carta screenshot. These are indexed and made available to Ava via vector search, so she can reference them directly in conversation ("I can see from your resume that you joined Bland in 2021 — can you tell me more about what you built in the first year?").

Uploading isn't required to start. The user can begin talking immediately and provide files later as they come up naturally.

### 3. Structured Data Is Extracted Silently

As the conversation unfolds, Ava is doing two things simultaneously:

- Engaging the user in a natural, supportive dialogue
- Extracting and organizing structured data into the fields required for each criterion

The user never sees a field labeled `equity_proof (files_or_urls)`. They see Ava asking: "Do you have a Carta screenshot or any documentation of your equity package?" The answer gets mapped to the right field automatically.

The **Data Collected** panel in the sidebar tracks this progress in real time. Each criterion shows which fields have been gathered and which are still missing, along with a completion percentage. As the conversation continues, the panel fills in — without the user ever touching a form.

### 4. Quality Assessment Runs in Parallel

The **Assessment** sidebar evaluates the strength of each criterion as evidence is gathered. Criteria are rated Strong, Medium, or Weak based on what the LLM can verify from the conversation and uploaded documents. Each card shows:

- What evidence has been collected
- What's missing or weak
- Specific next steps to strengthen the criterion

This gives both the user and the paralegal a live view of where the case stands.

### 5. The Paralegal Reviews, Not Rebuilds

When the session is complete, the paralegal has access to:

- The full conversation transcript
- Structured criterion data with completion status for every required field
- Strength assessments with evidence citations and gap analysis

Instead of reading a pile of disorganized emails and documents, the reviewer sees an organized intake package. They can spot missing fields, flag weak evidence, and follow up on specific points — rather than starting from scratch to figure out what the applicant actually submitted.

---

## Design Principles

**Low floor, not high ceiling.** The experience is designed for the most confused, most anxious user. Someone who doesn't know what a "critical role" means, doesn't know if their salary counts as "high remuneration," and is scared of getting something wrong. Ava explains every concept in plain language, provides examples, and never makes the user feel like they've failed if their evidence is incomplete.

**Progressive, not overwhelming.** No one is shown a list of 30 required fields on page load. The conversation reveals requirements naturally, in the order that makes sense for that person's case. Users don't need to know the full scope of what's being collected — they just need to answer the next question.

**The user knows their story, Ava knows the law.** The user is the expert on their career. Ava is the expert on what USCIS wants to see. The conversation is a collaboration between those two knowledge sources, not a user trying to learn immigration law on the fly.

---

## What's Built

| Feature | Status |
|---|---|
| Conversational data intake via AI (Ava) | ✅ |
| File/document upload and vector indexing | ✅ |
| Criterion-by-criterion data extraction | ✅ |
| Field completion tracking (Data Collected panel) | ✅ |
| Strength assessment per criterion (Assessment panel) | ✅ |
| O-1A criteria support (8 criteria) | ✅ |
| O-1B Arts criteria support (6 criteria) | ✅ |
| O-1B MPTV criteria support (1 criterion) | ✅ |
| Reference documentation (USCIS standards) embedded in LLM context | ✅ |

---

## What's Not Built (Proof of Concept Scope)

This is a prototype. Several things are intentionally left out or stubbed:

**No persistence.** Conversation history and collected criteria data live in browser state. Refreshing the page resets the session. A real implementation would persist to a database and let users return to an in-progress intake.

**No paralegal portal.** The "Send to Attorney" action is a placeholder. A real implementation would export the structured data package — conversation transcript, field values, uploaded files — into whatever case management system the team uses.

**No case strategy input UI.** The case strategy (which criteria to collect for) is currently baked into the LLM system prompt. In production, the paralegal would configure this per-applicant before sending the user a link.

**No evidence pushback.** The assessment sidebar identifies weak criteria and missing fields, but Ava doesn't yet actively reject insufficient evidence or loop the user back to strengthen a specific submission. That rejection/resubmission loop — where Ava says "this isn't enough, here's what a stronger version looks like" — is a key part of the intended experience.

**No demographic information section.** The test data includes a demographic block (legal name, passport, country of birth, current visa, address) that should be collected first, before criteria-specific intake begins. This section is absent from the current prototype.

**Session-based only, no user accounts.** A returning user cannot pick up where they left off across devices. Account-based sessions with long-term persistence would be needed for production.

---

## Tech Stack

- **Next.js 15 + React 19** — App Router, server components, API routes
- **TypeScript** — strict mode throughout
- **OpenAI API** — `gpt-4o` for conversation and analysis, vector stores for document retrieval
- **No external UI library** — inline styles only, keeping the dependency surface minimal

---

## Running Locally

```bash
npm install
cp .env.local.example .env.local
# Add your OPENAI_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first load, call `/api/init` to build the definitions vector store (this happens automatically when the page loads).

On subsequent runs, you can set `DEFINITIONS_VECTOR_STORE_ID` in `.env.local` to reuse the existing store and avoid re-uploading the reference documents.
