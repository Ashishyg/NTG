import type { GeneratedMatch, StageTypePlugin } from "@tournaments-leagues/domain/stages/types";
import { applyResultsToStandings } from "./standings-helpers";
import { singleEliminationPlugin } from "./single-elimination";

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function emptyParticipants(): GeneratedMatch["participants"] {
  return [
    { slot: 0, tournamentTeamId: null, teamLabel: null },
    { slot: 1, tournamentTeamId: null, teamLabel: null },
  ];
}

/**
 * Double elimination sized from the stage roster (pad to power of 2 with byes).
 *
 * 4 teams: WB SF→F, LB 1→1, GF
 * 8 teams: WB QF→SF→F, LB 2→2→1→1, GF
 * 16 teams: LB 4→4→2→2→1→1, etc.
 */
export const doubleEliminationPlugin: StageTypePlugin = {
  type: "DOUBLE_ELIMINATION",
  runnable: true,
  validateConfig() {
    return [];
  },
  generateMatches(ctx) {
    const teamIds =
      ctx.seededTeamIds.length > 0
        ? ctx.seededTeamIds
        : ctx.groups.flatMap((g) => g.teamIds);

    if (teamIds.length < 2) return [];

    const size = nextPowerOfTwo(teamIds.length);
    const wbRounds = Math.log2(size);

    const winners = singleEliminationPlugin.generateMatches(ctx).map((m) => ({
      ...m,
      key: m.key.replace(/^se-/, "de-w-"),
      nextWinnerKey: m.nextWinnerKey
        ? m.nextWinnerKey.replace(/^se-/, "de-w-")
        : null,
      nextLoserKey: null as string | null,
      bracketSide: "winners" as const,
    }));

    if (winners.length === 0) return [];

    const wbFinal = winners.reduce((best, m) =>
      m.roundNumber > best.roundNumber ? m : best,
    );

    // Losers-bracket round sizes: [S/4, S/4, S/8, S/8, ..., 1, 1]
    const lbMatchCounts: number[] = [];
    for (let i = 0; i < wbRounds - 1; i++) {
      const c = size / 2 ** (i + 2);
      lbMatchCounts.push(c, c);
    }

    const losers: GeneratedMatch[] = [];
    const lbKeys: string[][] = [];

    for (let r = 0; r < lbMatchCounts.length; r++) {
      const count = lbMatchCounts[r]!;
      const keys: string[] = [];
      for (let pos = 1; pos <= count; pos++) {
        keys.push(`de-l-r${r + 1}-p${pos}`);
      }
      lbKeys.push(keys);
    }

    for (let r = 0; r < lbMatchCounts.length; r++) {
      const count = lbMatchCounts[r]!;
      const nextCount = lbMatchCounts[r + 1] ?? 0;
      for (let pos = 1; pos <= count; pos++) {
        const key = lbKeys[r]![pos - 1]!;
        let nextWinnerKey: string | null = null;
        if (r + 1 < lbMatchCounts.length) {
          if (nextCount === count) {
            nextWinnerKey = lbKeys[r + 1]![pos - 1]!;
          } else if (nextCount * 2 === count) {
            nextWinnerKey = lbKeys[r + 1]![Math.ceil(pos / 2) - 1]!;
          } else if (nextCount === 1) {
            nextWinnerKey = lbKeys[r + 1]![0]!;
          } else {
            nextWinnerKey =
              lbKeys[r + 1]![Math.min(pos, nextCount) - 1] ?? null;
          }
        } else {
          nextWinnerKey = "de-gf";
        }

        losers.push({
          key,
          roundNumber: r + 1,
          positionInRound: pos,
          bracketSide: "losers",
          status: "SCHEDULED",
          nextWinnerKey,
          participants: emptyParticipants(),
        });
      }
    }

    // WB R1 → LB R1; WB Rw (w>1) → LB round 2*(w-1)
    for (const m of winners) {
      const w = m.roundNumber;
      if (w === 1) {
        const lbRound = lbKeys[0];
        if (!lbRound?.length) continue;
        const lbPos = Math.ceil(m.positionInRound / 2);
        m.nextLoserKey = lbRound[lbPos - 1] ?? lbRound[0]!;
      } else {
        const lbRoundIndex = 2 * (w - 1) - 1;
        const lbRound = lbKeys[lbRoundIndex];
        if (!lbRound?.length) continue;
        const lbPos = Math.min(m.positionInRound, lbRound.length);
        m.nextLoserKey = lbRound[lbPos - 1]!;
      }
    }

    for (const m of winners) {
      if (m.key === wbFinal.key) {
        m.nextWinnerKey = "de-gf";
      }
    }

    const grandFinal: GeneratedMatch = {
      key: "de-gf",
      roundNumber: wbRounds + 1,
      positionInRound: 1,
      bracketSide: "grand_final",
      status: "SCHEDULED",
      participants: [
        { slot: 0, tournamentTeamId: null, teamLabel: "Winners Final" },
        { slot: 1, tournamentTeamId: null, teamLabel: "Losers Final" },
      ],
    };

    return [...winners, ...losers, grandFinal];
  },
  computeStandings({ teamIds, teamNames, results }) {
    return applyResultsToStandings(teamIds, teamNames, results);
  },
};
