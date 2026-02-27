// lib/session.ts
// Cookie-based session helpers for Next.js App Router route handlers.
// All cookie reads use `next/headers` cookies() (server-only).
// Cookie writes are done via NextResponse.cookies in each route handler.

import { cookies } from "next/headers";

export const SESSION_COOKIE = "o1_session_id";
export const USER_VS_COOKIE = "o1_user_vs_id";
export const DEFS_VS_COOKIE = "o1_defs_vs_id";

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
} as const;

/** Read session ID from cookie jar. Returns undefined if not yet set. */
export async function readSessionId(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

/** Read user evidence vector store ID from cookie jar. */
export async function readUserVsId(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(USER_VS_COOKIE)?.value;
}

/** Read definitions vector store ID from cookie jar (fallback to env var). */
export async function readDefsVsId(): Promise<string | undefined> {
  if (process.env.DEFINITIONS_VECTOR_STORE_ID) {
    return process.env.DEFINITIONS_VECTOR_STORE_ID;
  }
  const jar = await cookies();
  return jar.get(DEFS_VS_COOKIE)?.value;
}
