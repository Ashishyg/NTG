import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { searchRosterCandidates } from "@roster-listings/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { searchParams } = new URL(req.url);
  const gameKey = searchParams.get("gameKey")?.trim() ?? "";
  const search = searchParams.get("search")?.trim() ?? "";

  if (!gameKey) {
    return NextResponse.json({ error: "gameKey is required." }, { status: 400 });
  }

  const candidates = await searchRosterCandidates(gameKey, search);
  return NextResponse.json({ candidates });
}
