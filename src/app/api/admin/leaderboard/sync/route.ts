import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import {
  getLeaderboardSyncStats,
  syncAllLinkedPlayers,
  type SyncRunTotals,
} from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type SyncBatchBody = {
  runStartedAt?: string;
  totals?: SyncRunTotals;
};

function accumulateTotals(prev: SyncRunTotals | undefined, batch: SyncRunTotals): SyncRunTotals {
  return {
    synced: (prev?.synced ?? 0) + batch.synced,
    failed: (prev?.failed ?? 0) + batch.failed,
    skipped: (prev?.skipped ?? 0) + batch.skipped,
    batches: (prev?.batches ?? 0) + batch.batches,
  };
}

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const stats = await getLeaderboardSyncStats();
  return NextResponse.json({ stats });
}

/** Run one batch of the full leaderboard sync (26 players). Client loops until complete. */
export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: SyncBatchBody = {};
  try {
    body = (await req.json()) as SyncBatchBody;
  } catch {
    /* empty body ok — starts new run */
  }

  const runStartedAt = body.runStartedAt
    ? new Date(body.runStartedAt)
    : new Date();

  if (Number.isNaN(runStartedAt.getTime())) {
    return NextResponse.json({ error: "Invalid runStartedAt." }, { status: 400 });
  }

  const batch = await syncAllLinkedPlayers({
    fullRefreshBefore: runStartedAt,
    tryAllRegions: true,
  });

  const totals = accumulateTotals(body.totals, {
    synced: batch.synced,
    failed: batch.failed,
    skipped: batch.skipped,
    batches: 1,
  });

  const complete = !batch.hasMore;
  const stats = await getLeaderboardSyncStats();

  if (complete) {
    await logAdminAction(auth.userId, "leaderboard.sync", undefined, {
      runStartedAt: runStartedAt.toISOString(),
      ...totals,
    });
  }

  return NextResponse.json({
    ok: true,
    runStartedAt: runStartedAt.toISOString(),
    batch,
    totals,
    complete,
    stats,
  });
}
