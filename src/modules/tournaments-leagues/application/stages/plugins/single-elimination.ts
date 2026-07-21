import type { GeneratedMatch, StageTypePlugin } from "@tournaments-leagues/domain/stages/types";
import { applyResultsToStandings } from "./standings-helpers";

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Classic single-elim bracket with byes padded to power of 2. */
export const singleEliminationPlugin: StageTypePlugin = {
  type: "SINGLE_ELIMINATION",
  runnable: true,
  validateConfig(stage) {
    return [];
  },
  generateMatches(ctx) {
    const teamIds =
      ctx.seededTeamIds.length > 0
        ? ctx.seededTeamIds
        : ctx.groups.flatMap((g) => g.teamIds);

    if (teamIds.length < 2) return [];

    const size = nextPowerOfTwo(teamIds.length);
    const slots: (string | null)[] = [...teamIds];
    while (slots.length < size) slots.push(null);

    // Standard seeding placement into bracket slots
    const bracketSlots = seedIntoBracket(slots);

    const totalRounds = Math.log2(size);
    const matches: GeneratedMatch[] = [];
    const roundKeys: string[][] = [];

    for (let round = 1; round <= totalRounds; round++) {
      const matchCount = size / 2 ** round;
      const keys: string[] = [];
      for (let pos = 1; pos <= matchCount; pos++) {
        const key = `se-r${round}-p${pos}`;
        keys.push(key);
      }
      roundKeys.push(keys);
    }

    // Round 1 participants
    for (let pos = 0; pos < size / 2; pos++) {
      const a = bracketSlots[pos * 2] ?? null;
      const b = bracketSlots[pos * 2 + 1] ?? null;
      const key = roundKeys[0]![pos]!;
      const nextWinnerKey = totalRounds > 1 ? roundKeys[1]![Math.floor(pos / 2)]! : null;
      const isBye = !a || !b;

      matches.push({
        key,
        roundNumber: 1,
        positionInRound: pos + 1,
        bracketSide: "winners",
        status: isBye ? "BYE" : "SCHEDULED",
        nextWinnerKey,
        participants: [
          {
            slot: 0,
            tournamentTeamId: a,
            teamLabel: a ? ctx.teamNames.get(a) ?? null : null,
            seed: a ? teamIds.indexOf(a) + 1 : null,
            isBye: !a,
          },
          {
            slot: 1,
            tournamentTeamId: b,
            teamLabel: b ? ctx.teamNames.get(b) ?? null : null,
            seed: b ? teamIds.indexOf(b) + 1 : null,
            isBye: !b,
          },
        ],
      });
    }

    for (let round = 2; round <= totalRounds; round++) {
      const matchCount = size / 2 ** round;
      for (let pos = 0; pos < matchCount; pos++) {
        const key = roundKeys[round - 1]![pos]!;
        const nextWinnerKey =
          round < totalRounds ? roundKeys[round]![Math.floor(pos / 2)]! : null;
        matches.push({
          key,
          roundNumber: round,
          positionInRound: pos + 1,
          bracketSide: "winners",
          status: "SCHEDULED",
          nextWinnerKey,
          participants: [
            { slot: 0, tournamentTeamId: null, teamLabel: null },
            { slot: 1, tournamentTeamId: null, teamLabel: null },
          ],
        });
      }
    }

    return matches;
  },
  computeStandings({ teamIds, teamNames, results }) {
    return applyResultsToStandings(teamIds, teamNames, results);
  },
};

/** Place seeds so 1 plays last, 2 plays 2nd-last, etc. */
function seedIntoBracket(slots: (string | null)[]): (string | null)[] {
  const n = slots.length;
  if (n <= 1) return slots;
  const ordered: (string | null)[] = Array(n).fill(null);
  const positions = bracketSeedPositions(n);
  for (let i = 0; i < slots.length; i++) {
    ordered[positions[i]!] = slots[i] ?? null;
  }
  return ordered;
}

function bracketSeedPositions(n: number): number[] {
  if (n === 1) return [0];
  const half = bracketSeedPositions(n / 2);
  const result: number[] = [];
  for (const p of half) {
    result.push(p);
    result.push(n - 1 - p);
  }
  return result;
}
