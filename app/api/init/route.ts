// app/api/init/route.ts
// POST /api/init  { apiKey?: string }
// Creates (or reuses) a per-user evidence vector store and ensures the global
// definitions store is built from /refs. Sets httpOnly cookies for both IDs.
//
// Runtime: nodejs  — needed for `fs` and large response bodies.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { makeOpenAIClient } from "@/lib/openai";
import { createVectorStore, attachFilesToVectorStore, pollVectorStoreFileBatch } from "@/lib/vectorStore";
import {
  SESSION_COOKIE,
  USER_VS_COOKIE,
  DEFS_VS_COOKIE,
  COOKIE_OPTIONS,
  readSessionId,
  readUserVsId,
  readDefsVsId,
} from "@/lib/session";

// ---------------------------------------------------------------------------
// Module-level cache for the definitions store.
// Survives across requests within the same Node.js process, so we only upload
// the /refs files once per server start.  In production you MUST set
// DEFINITIONS_VECTOR_STORE_ID in your environment instead.
// ---------------------------------------------------------------------------
let _cachedDefsVsId: string | null = null;

async function ensureDefinitionsStore(client: OpenAI): Promise<string> {
  // 1. Env var wins — set this after the first run so you don't re-upload.
  if (process.env.DEFINITIONS_VECTOR_STORE_ID) {
    return process.env.DEFINITIONS_VECTOR_STORE_ID;
  }

  // 2. In-process cache (same Node.js instance).
  if (_cachedDefsVsId) return _cachedDefsVsId;

  // 3. Cookie from a previous init in this browser session (survives restarts).
  const cookieVsId = await readDefsVsId();
  if (cookieVsId) {
    _cachedDefsVsId = cookieVsId;
    return cookieVsId;
  }

  // 4. First ever run: create a new store and index all /refs files.
  console.log("[init] Creating definitions vector store from /refs …");
  const store = await createVectorStore("O1 Visa Definitions", client);

  const refsDir = path.join(process.cwd(), "refs");
  const filenames = fs
    .readdirSync(refsDir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".json"));

  const fileIds: string[] = [];
  for (const filename of filenames) {
    const buf = fs.readFileSync(path.join(refsDir, filename));
    const mime = filename.endsWith(".json") ? "application/json" : "text/markdown";
    const uploaded = await client.files.create({
      file: new File([buf], filename, { type: mime }),
      purpose: "assistants",
    });
    fileIds.push(uploaded.id);
    console.log(`[init] Uploaded ref file: ${filename} → ${uploaded.id}`);
  }

  const batch = await attachFilesToVectorStore({ vectorStoreId: store.id, fileIds }, client);
  await pollVectorStoreFileBatch({ vectorStoreId: store.id, batchId: batch.id }, client);

  _cachedDefsVsId = store.id;
  console.log(`[init] Definitions store ready: ${store.id}`);
  console.log(`[init] >>> Add to .env.local: DEFINITIONS_VECTOR_STORE_ID=${store.id} <<<`);

  return store.id;
}

// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { apiKey?: string };
    const client = makeOpenAIClient(body.apiKey);

    // Read existing cookies (may be undefined on first visit).
    const existingSessionId = await readSessionId();
    const existingUserVsId = await readUserVsId();

    const sessionId = existingSessionId ?? crypto.randomUUID();

    // Ensure global definitions store.
    const defsVsId = await ensureDefinitionsStore(client);

    // Ensure per-user evidence store.
    let userVsId = existingUserVsId;
    if (!userVsId) {
      const userStore = await createVectorStore(`O1 Evidence [${sessionId.slice(0, 8)}]`, client);
      userVsId = userStore.id;
      console.log(`[init] Created user evidence store: ${userVsId} for session ${sessionId}`);
    }

    const res = NextResponse.json({ userVectorStoreId: userVsId });

    // Persist IDs in httpOnly cookies.
    res.cookies.set(SESSION_COOKIE, sessionId, COOKIE_OPTIONS);
    res.cookies.set(USER_VS_COOKIE, userVsId, COOKIE_OPTIONS);
    res.cookies.set(DEFS_VS_COOKIE, defsVsId, COOKIE_OPTIONS);

    return res;
  } catch (err) {
    console.error("[init] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
