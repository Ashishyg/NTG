import { prisma } from "@core/database/client";
import { getStagePlugin } from "./stage-registry";
import type { StandingRow } from "@tournaments-leagues/domain/stages/types";
import { parseScorePair } from "./plugins/standings-helpers";
import { parseStoredGames } from "./series-format";

export async function computeGroupStandings(
  stageId: string,
  groupId: string,
): Promise<StandingRow[]> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    select: { stageType: true },
  });
  if (!stage) return [];

  const group = await prisma.tournamentStageGroup.findUnique({
    where: { id: groupId },
    include: {
      slots: {
        where: { teamId: { not: null } },
        include: { team: true },
      },
    },
  });
  if (!group) return [];

  const teamIds = group.slots.map((s) => s.teamId!);
  const teamNames = new Map(
    group.slots.map((s) => [s.teamId!, s.team?.name ?? "Team"] as const),
  );

  const matches = await prisma.match.findMany({
    where: {
      stageGroupId: groupId,
      status: "COMPLETED",
      result: { isNot: null },
    },
    include: {
      participants: true,
      result: true,
    },
  });

  const results = matches
    .map((m) => {
      const a = m.participants.find((p) => p.slot === 0);
      const b = m.participants.find((p) => p.slot === 1);
      if (!a?.tournamentTeamId || !b?.tournamentTeamId || !m.result) return null;
      const winner =
        m.result.winnerSlot === 0
          ? a.tournamentTeamId
          : m.result.winnerSlot === 1
            ? b.tournamentTeamId
            : null;
      return {
        teamAId: a.tournamentTeamId,
        teamBId: b.tournamentTeamId,
        winnerTeamId: winner,
        scoreA: m.result.scoreA,
        scoreB: m.result.scoreB,
        scoreSummary: m.result.scoreSummary,
        games: parseStoredGames(m.result.games),
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return getStagePlugin(stage.stageType).computeStandings({
    teamIds,
    teamNames,
    results,
  });
}

export async function computeStageStandings(stageId: string): Promise<
  { groupId: string; groupName: string; standings: StandingRow[] }[]
> {
  const groups = await prisma.tournamentStageGroup.findMany({
    where: { stageId },
    orderBy: { order: "asc" },
  });
  const out = [];
  for (const g of groups) {
    out.push({
      groupId: g.id,
      groupName: g.name,
      standings: await computeGroupStandings(stageId, g.id),
    });
  }
  return out;
}

/** Standings for bracket-only stages (SE/DE with no pools). */
export async function computeBracketStageStandings(
  stageId: string,
): Promise<StandingRow[]> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    include: {
      bracket: {
        include: {
          matches: {
            include: { participants: true, result: true },
          },
        },
      },
      seedingEntries: { orderBy: { seed: "asc" }, include: { team: true } },
    },
  });
  if (!stage?.bracket) return [];

  const teamNames = new Map<string, string>();
  const teamIds = new Set<string>();
  for (const e of stage.seedingEntries) {
    teamIds.add(e.teamId);
    teamNames.set(e.teamId, e.team.name);
  }
  for (const m of stage.bracket.matches) {
    for (const p of m.participants) {
      if (p.tournamentTeamId) {
        teamIds.add(p.tournamentTeamId);
        teamNames.set(p.tournamentTeamId, p.teamLabel ?? "Team");
      }
    }
  }

  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const maxWinnersRound = new Map<string, number>();
  const roundsFor = new Map<string, number>();
  const roundsAgainst = new Map<string, number>();

  for (const id of teamIds) {
    wins.set(id, 0);
    losses.set(id, 0);
    maxWinnersRound.set(id, 0);
    roundsFor.set(id, 0);
    roundsAgainst.set(id, 0);
  }

  for (const m of stage.bracket.matches) {
    if (m.bracketSide === "losers") continue;
    const a = m.participants.find((p) => p.slot === 0);
    const b = m.participants.find((p) => p.slot === 1);
    const aId = a?.tournamentTeamId;
    const bId = b?.tournamentTeamId;

    for (const tid of [aId, bId]) {
      if (tid) {
        maxWinnersRound.set(
          tid,
          Math.max(maxWinnersRound.get(tid) ?? 0, m.roundNumber),
        );
      }
    }

    if (m.status === "BYE") {
      const winner = aId ?? bId;
      if (winner) wins.set(winner, (wins.get(winner) ?? 0) + 1);
      continue;
    }
    if (m.status !== "COMPLETED" || !m.result) continue;
    if (!aId || !bId) continue;

    const winner =
      m.result.winnerSlot === 0
        ? aId
        : m.result.winnerSlot === 1
          ? bId
          : null;
    const loser =
      m.result.winnerSlot === 0
        ? bId
        : m.result.winnerSlot === 1
          ? aId
          : null;
    if (winner) wins.set(winner, (wins.get(winner) ?? 0) + 1);
    if (loser) losses.set(loser, (losses.get(loser) ?? 0) + 1);

    const storedGames = parseStoredGames((m.result as { games?: unknown }).games);
    let scores: { a: number; b: number } | null = null;
    if (storedGames && storedGames.length > 0) {
      let sa = 0, sb = 0, hasSc = false;
      for (const g of storedGames) {
        if (typeof g.scoreA === "number" && typeof g.scoreB === "number") {
          sa += g.scoreA;
          sb += g.scoreB;
          hasSc = true;
        }
      }
      if (hasSc) scores = { a: sa, b: sb };
    }
    if (!scores) {
      scores = parseScorePair(
        m.result.scoreA,
        m.result.scoreB,
        m.result.scoreSummary,
      );
    }
    if (scores) {
      roundsFor.set(aId, (roundsFor.get(aId) ?? 0) + scores.a);
      roundsAgainst.set(aId, (roundsAgainst.get(aId) ?? 0) + scores.b);
      roundsFor.set(bId, (roundsFor.get(bId) ?? 0) + scores.b);
      roundsAgainst.set(bId, (roundsAgainst.get(bId) ?? 0) + scores.a);
    }
  }

  const rows = [...teamIds].map((teamId) => {
    const rf = roundsFor.get(teamId) ?? 0;
    const ra = roundsAgainst.get(teamId) ?? 0;
    return {
      teamId,
      teamName: teamNames.get(teamId) ?? "Team",
      played: (wins.get(teamId) ?? 0) + (losses.get(teamId) ?? 0),
      wins: wins.get(teamId) ?? 0,
      losses: losses.get(teamId) ?? 0,
      draws: 0,
      points: wins.get(teamId) ?? 0,
      roundDiff: rf - ra,
      roundsFor: rf,
      roundsAgainst: ra,
      position: 0,
      _depth: maxWinnersRound.get(teamId) ?? 0,
    };
  });

  rows.sort(
    (a, b) =>
      b._depth - a._depth ||
      b.wins - a.wins ||
      b.roundDiff - a.roundDiff ||
      b.roundsFor - a.roundsFor ||
      a.losses - b.losses ||
      a.teamName.localeCompare(b.teamName),
  );

  return rows.map(({ _depth: _, ...r }, i) => ({ ...r, position: i + 1 }));
}
