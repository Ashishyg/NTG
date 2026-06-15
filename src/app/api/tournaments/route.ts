import { handleTournamentsNotImplemented } from "@tournaments-leagues/api/tournament.handlers";
import { serverEnv } from "@core/config/env.server";
import { listTournamentPreviews } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return handleTournamentsNotImplemented();
  }
  try {
    const tournaments = await listTournamentPreviews();
    return NextResponse.json({ tournaments });
  } catch {
    return handleTournamentsNotImplemented();
  }
}
