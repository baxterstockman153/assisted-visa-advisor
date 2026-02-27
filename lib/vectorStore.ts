// lib/vectorStore.ts
import { openai } from "./openai";

export async function createVectorStore(name: string) {
    const store = await openai.vectorStores.create({ name });
    return store; // { id, name, ... }
}

export async function attachFilesToVectorStore(params: {
    vectorStoreId: string;
    fileIds: string[];
}) {
    const { vectorStoreId, fileIds } = params;

    if (fileIds.length === 0) {
        throw new Error("attachFilesToVectorStore: fileIds cannot be empty");
    }

    const batch = await openai.vectorStores.fileBatches.create(vectorStoreId, {
        file_ids: fileIds,
    });

    return batch; // { id, status, file_counts, ... }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollVectorStoreFileBatch(params: {
    vectorStoreId: string;
    batchId: string;
    intervalMs?: number;
    timeoutMs?: number;
}) {
    const { vectorStoreId, batchId, intervalMs = 1500, timeoutMs = 120_000 } = params;

    const start = Date.now();

    while (true) {
        const batch = await openai.vectorStores.fileBatches.retrieve(vectorStoreId, batchId);

        const counts = batch.file_counts ?? {};
        const inProgress = counts.in_progress ?? 0;
        const failed = counts.failed ?? 0;

        // When ingestion finishes, in_progress typically becomes 0.
        if (inProgress === 0) {
            if (failed > 0) {
                throw new Error(`Vector store ingestion finished with failures (failed=${failed}).`);
            }
            return batch;
        }

        if (Date.now() - start > timeoutMs) {
            throw new Error("Timed out waiting for vector store ingestion to complete.");
        }

        await sleep(intervalMs);
    }
}