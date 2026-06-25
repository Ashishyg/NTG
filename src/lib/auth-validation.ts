import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { AUTH_GENERIC_VALIDATION_ERROR } from "@auth-membership/domain/auth-messages";

/** Structured server log for auth validation failures (monitoring). */
export function logAuthValidationFailure(route: string, detail: string): void {
  console.warn(`[auth-validation] route=${route} detail=${detail}`);
}

/**
 * Zod format/length errors are safe to show — they don't reveal whether an account exists.
 */
export function formatSafeValidationError(error: ZodError): string {
  return error.issues[0]?.message ?? AUTH_GENERIC_VALIDATION_ERROR;
}

export function authValidationErrorResponse(
  route: string,
  error: ZodError,
): NextResponse {
  const fields = error.issues.map((i) => i.path.join(".") || "input").join(",");
  logAuthValidationFailure(route, `fields=${fields}`);
  return NextResponse.json(
    { error: formatSafeValidationError(error) },
    { status: 400 },
  );
}
