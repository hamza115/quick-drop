import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { ZodError } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { isSameOriginRequest, originOf } from "@/lib/security/origin";
import { consumeRateLimit, type RateLimitRule } from "@/lib/security/rate-limit";

/** Consistent error body: { error: { code, message } }. Messages are safe to show to the user. */
export function apiError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function getApiUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user.id ?? null;
}

/**
 * CSRF guard for state-changing routes. Returns a 403 response when the request comes from
 * another site, or null when it may continue. Auth routes are covered by Better Auth itself.
 */
export function rejectCrossOrigin(request: NextRequest): NextResponse | null {
  const allowed = [originOf(getEnv().APP_URL), request.nextUrl.origin.toLowerCase()].filter(
    (origin): origin is string => origin !== null,
  );
  if (isSameOriginRequest(request.headers, allowed)) return null;
  return apiError(403, "cross_origin", "This request must come from QuickDrop itself.");
}

/** Returns a 429 response when the user is over the limit, or null when the request may continue. */
export async function rejectRateLimited(userId: string, rule: RateLimitRule): Promise<NextResponse | null> {
  const { allowed, retryAfterSeconds } = await consumeRateLimit(userId, rule);
  if (allowed) return null;
  const response = apiError(429, "rate_limited", "You're doing that too often. Wait a few minutes and try again.");
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

/** Returns undefined when the body is missing or not valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Check the details and try again.";
}

export function handleApiError(action: string, error: unknown): NextResponse {
  // Log only the error type. Driver messages can contain connection details.
  console.error(`[api] ${action} failed:`, error instanceof Error ? error.name : "unknown error");
  return apiError(500, "internal_error", "Something went wrong on our side. Try again.");
}
