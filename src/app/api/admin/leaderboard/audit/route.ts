import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { listLeaderboardRankAudits } from "@tournaments-leagues/application/rank-sync.service";
import { LeaderboardSyncSource } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set<string>(Object.values(LeaderboardSyncSource));

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "50");
  const changedOnly = searchParams.get("changedOnly") === "true";
  const sourceRaw = searchParams.get("source");
  const source =
    sourceRaw && VALID_SOURCES.has(sourceRaw)
      ? (sourceRaw as LeaderboardSyncSource)
      : undefined;

  try {
    const rows = await listLeaderboardRankAudits({ limit, changedOnly, source });
    return NextResponse.json({ rows });
  } catch (err) {
    console.error("[admin/leaderboard/audit GET]", err);
    return NextResponse.json({ error: "Could not load audit log." }, { status: 500 });
  }
}
