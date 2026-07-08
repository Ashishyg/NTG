import { isCronAuthorized } from "@/lib/cron-auth";
import { serverEnv } from "@core/config/env.server";
import { syncRegistrationStatus } from "@tournaments-leagues/index";
import { syncTryoutListingStatus } from "@roster-listings/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!serverEnv.cronSecret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }

  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    const [tournaments, tryouts] = await Promise.all([
      syncRegistrationStatus(),
      syncTryoutListingStatus(),
    ]);
    return NextResponse.json({ ok: true, ...tournaments, tryoutsUpdated: tryouts.updated });
  } catch {
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
