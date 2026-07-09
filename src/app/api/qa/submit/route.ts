import { getSession } from "@core/auth/session";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@core/config/env.server";
import { submitQaResponse } from "@time-limited-qa/index";
import { qaSubmitSchema } from "@time-limited-qa/domain/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const limited = await enforceRateLimit(req, AUTH_RATE_LIMITS.qaSubmit);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = qaSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission." },
      { status: 400 },
    );
  }

  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const result = await submitQaResponse({
    userId,
    isAnonymous: parsed.data.isAnonymous,
    guestName: parsed.data.guestName,
    responses: parsed.data.responses,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, responseId: result.responseId });
}
