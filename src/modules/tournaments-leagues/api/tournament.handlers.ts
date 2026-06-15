import { NextResponse } from "next/server";

export function handleTournamentsNotImplemented() {
  return NextResponse.json(
    { error: "Tournaments API stub", module: "tournaments-leagues" },
    { status: 501 },
  );
}

export function handleLeaderboardNotImplemented() {
  return NextResponse.json(
    { error: "Leaderboard API stub", module: "tournaments-leagues" },
    { status: 501 },
  );
}

export function handleMatchesNotImplemented() {
  return NextResponse.json(
    { error: "Matches API stub", module: "tournaments-leagues" },
    { status: 501 },
  );
}
