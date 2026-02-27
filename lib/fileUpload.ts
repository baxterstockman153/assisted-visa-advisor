// lib/fileUpload.ts
import { openai } from "./openai";
import { attachFilesToVectorStore, pollVectorStoreFileBatch } from "./vectorStore";

/**
 * Upload a browser File (from FormData) to OpenAI.
 * Next.js route handlers can pass the File object directly.
 */
export async function uploadBrowserFileToOpenAI(file: File) {
    // Convert Web File -> ArrayBuffer -> Buffer for Node SDK
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // The OpenAI Node SDK supports a "File-like" value.
    // Buffer + filename works.
    const uploaded = await openai.files.create({
        file: new File([buffer], file.name, { type: file.type || "application/octet-stream" }),
        purpose: "assistants",
    });

    return uploaded; // { id: "file_...", ... }
}

/**
 * Convenience: upload many files and attach them to a vector store, waiting until indexed.
 */
export async function uploadAndIndexEvidenceFiles(params: {
    vectorStoreId: string;
    files: File[];
}) {
    const { vectorStoreId, files } = params;

    if (!files.length) {
        return { fileIds: [], batchId: null as string | null };
    }

    // 1) Upload each file to OpenAI Files API
    const uploaded = [];
    for (const file of files) {
        const up = await uploadBrowserFileToOpenAI(file);
        uploaded.push(up);
    }
    const fileIds = uploaded.map((f) => f.id);

    // 2) Attach to vector store (ingest)
    const batch = await attachFilesToVectorStore({
        vectorStoreId,
        fileIds,
    });

    // 3) Poll until ingestion completes
    await pollVectorStoreFileBatch({
        vectorStoreId,
        batchId: batch.id,
    });

    return { fileIds, batchId: batch.id };
}