import { serverEnv } from "@core/config/env.server";
import { listRosterTeams } from "@roster-listings/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const teams = await listRosterTeams();
  return NextResponse.json({ teams });
}
