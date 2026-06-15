import { NextResponse } from "next/server";
import { getSession } from "@core/auth/session";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";

export type GuardSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
};

export type SessionResult =
  | { ok: true; session: GuardSession; userId: string }
  | { ok: false; status: 401; error: string };

export type AdminResult =
  | { ok: true; session: GuardSession; userId: string }
  | { ok: false; status: 401 | 403 | 503; error: string };

/** Requires a valid logged-in session. Returns null session as 401. */
export async function requireSession(): Promise<SessionResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return {
    ok: true,
    session: session as GuardSession,
    userId: session.user.id,
  };
}

/**
 * Requires ADMIN role or email listed in ADMIN_EMAILS.
 * Fails fast with 401 (no session), 403 (not admin), or 503 (no DB).
 */
export async function requireAdmin(): Promise<AdminResult> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) {
    return sessionResult;
  }

  if (!serverEnv.databaseUrl) {
    return { ok: false, status: 503, error: "Database not configured" };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionResult.userId },
    select: { role: true, email: true },
  });

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin =
    user?.role === "ADMIN" ||
    (user?.email && adminEmails.includes(user.email.toLowerCase()));

  if (!isAdmin) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return {
    ok: true,
    session: sessionResult.session,
    userId: sessionResult.userId,
  };
}

/** Type guard after requireSession(). */
export function isAuthedSession(result: SessionResult): result is Extract<SessionResult, { ok: true }> {
  return result.ok;
}

/** Type guard after requireAdmin(). */
export function isAuthedAdmin(result: AdminResult): result is Extract<AdminResult, { ok: true }> {
  return result.ok;
}

/** Convert a failed guard result into a JSON response; returns null when authorized. */
export function guardResponse(
  result: SessionResult | AdminResult,
): NextResponse | null {
  if (result.ok) return null;
  return NextResponse.json({ error: result.error }, { status: result.status });
}
