import { isCronAuthorized } from "@/lib/cron-auth";
import { dispatchDailyLeaderboardWorkflow } from "@/lib/github-actions-dispatch";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight trigger — dispatches the GHA workflow; sync runs on GitHub runners. */
export const maxDuration = 10;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!serverEnv.cronSecret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }

  const result = await dispatchDailyLeaderboardWorkflow();
  if (!result.ok) {
    console.error("[cron/trigger-daily-leaderboard]", result.reason);
    return NextResponse.json({ ok: false, error: result.reason }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    dispatched: true,
    workflow: "daily-leaderboard-refresh.yml",
  });
}
