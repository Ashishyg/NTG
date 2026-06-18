import { handleLinkRiotProfile } from "@auth-membership/api/register.handlers";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, AUTH_RATE_LIMITS.riotLink);
  if (limited) return limited;

  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  return handleLinkRiotProfile(req);
}
