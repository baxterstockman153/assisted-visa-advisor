// app/api/upload/route.ts
// POST /api/upload  (multipart/form-data, field name: "files")
// Uploads each file to OpenAI Files API, attaches them to the user's evidence
// vector store, and polls until ingestion is complete.
//
// Runtime: nodejs — required for multipart parsing and OpenAI file uploads.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { uploadAndIndexEvidenceFiles } from "@/lib/fileUpload";
import { readUserVsId } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const userVsId = await readUserVsId();
    if (!userVsId) {
      return NextResponse.json(
        { error: "Session not initialised — call POST /api/init first." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const rawFiles = formData.getAll("files");

    // formData.getAll returns (File | string)[]; keep only File instances.
    const files = rawFiles.filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    const { fileIds, batchId } = await uploadAndIndexEvidenceFiles({
      vectorStoreId: userVsId,
      files,
    });

    return NextResponse.json({ success: true, fileIds, batchId });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
