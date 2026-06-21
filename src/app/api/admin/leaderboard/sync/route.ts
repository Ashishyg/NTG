import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import {
  getLeaderboardSyncStats,
  RANK_SYNC_BATCH_SIZE,
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

  try {
    const stats = await getLeaderboardSyncStats();
    return NextResponse.json({ stats });
  } catch (err) {
    console.error("[admin/leaderboard/sync GET]", err);
    return NextResponse.json({ error: "Could not load sync stats." }, { status: 500 });
  }
}

/** Run one batch of the full leaderboard sync. Client loops until complete. */
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

  const isNewRun = !body.runStartedAt;

  try {
    const runId = runStartedAt.toISOString();
    const batch = await syncAllLinkedPlayers({
      fullRefreshBefore: runStartedAt,
      tryAllRegions: true,
      maxBatchSize: RANK_SYNC_BATCH_SIZE,
      snapshotRanks: isNewRun,
      context: {
        source: "manual",
        runId,
        adminId: auth.userId,
      },
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
  } catch (err) {
    console.error("[admin/leaderboard/sync POST]", err);
    const message = err instanceof Error ? err.message : "Sync batch failed.";
    return NextResponse.json(
      {
        error:
          message.includes("timeout") || message.includes("Timeout")
            ? "Sync batch timed out. Try again — progress is saved between batches."
            : "Sync batch failed. Try again in a moment.",
      },
      { status: 500 },
    );
  }
}
