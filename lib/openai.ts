// lib/openai.ts
import OpenAI from "openai";

/**
 * Create an OpenAI client using the provided key, falling back to the
 * OPENAI_API_KEY environment variable. Throws if neither is available.
 */
export function makeOpenAIClient(apiKey?: string): OpenAI {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
        throw new Error("No OpenAI API key provided.");
    }
    return new OpenAI({ apiKey: key });
}
