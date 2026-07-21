import type { StandingRow } from "@tournaments-leagues/domain/stages/types";

export function emptyStandings(
  teamIds: string[],
  teamNames: Map<string, string>,
): StandingRow[] {
  return teamIds.map((teamId, i) => ({
    teamId,
    teamName: teamNames.get(teamId) ?? "Team",
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    roundDiff: 0,
    roundsFor: 0,
    roundsAgainst: 0,
    position: i + 1,
  }));
}

export function parseScorePair(
  scoreA?: number | null,
  scoreB?: number | null,
  scoreSummary?: string | null,
): { a: number; b: number } | null {
  if (
    typeof scoreA === "number" &&
    typeof scoreB === "number" &&
    Number.isFinite(scoreA) &&
    Number.isFinite(scoreB)
  ) {
    return { a: scoreA, b: scoreB };
  }
  if (!scoreSummary) return null;
  const m = /^(\d+)\s*[-:]\s*(\d+)$/.exec(scoreSummary.trim());
  if (!m) return null;
  return { a: Number(m[1]), b: Number(m[2]) };
}

export function applyResultsToStandings(
  teamIds: string[],
  teamNames: Map<string, string>,
  results: {
    teamAId: string;
    teamBId: string;
    winnerTeamId: string | null;
    isDraw?: boolean;
    scoreA?: number | null;
    scoreB?: number | null;
    scoreSummary?: string | null;
  }[],
  pointsWin = 3,
  pointsDraw = 1,
): StandingRow[] {
  const map = new Map(
    emptyStandings(teamIds, teamNames).map((row) => [row.teamId, { ...row }]),
  );

  for (const r of results) {
    const a = map.get(r.teamAId);
    const b = map.get(r.teamBId);
    if (!a || !b) continue;
    a.played += 1;
    b.played += 1;
    if (r.isDraw || !r.winnerTeamId) {
      a.draws += 1;
      b.draws += 1;
      a.points += pointsDraw;
      b.points += pointsDraw;
    } else if (r.winnerTeamId === r.teamAId) {
      a.wins += 1;
      b.losses += 1;
      a.points += pointsWin;
    } else {
      b.wins += 1;
      a.losses += 1;
      b.points += pointsWin;
    }

    const scores = parseScorePair(r.scoreA, r.scoreB, r.scoreSummary);
    if (scores) {
      a.roundsFor += scores.a;
      a.roundsAgainst += scores.b;
      a.roundDiff = a.roundsFor - a.roundsAgainst;
      b.roundsFor += scores.b;
      b.roundsAgainst += scores.a;
      b.roundDiff = b.roundsFor - b.roundsAgainst;
    }
  }

  const sorted = [...map.values()].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (y.roundDiff !== x.roundDiff) return y.roundDiff - x.roundDiff;
    return x.teamName.localeCompare(y.teamName);
  });

  return sorted.map((row, i) => ({ ...row, position: i + 1 }));
}
