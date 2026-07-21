import type { GeneratedMatch, StageTypePlugin } from "@tournaments-leagues/domain/stages/types";
import { applyResultsToStandings } from "./standings-helpers";

function circlePairings(teamIds: string[]): [string, string][][] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push("__BYE__");

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = [...ids];
  const result: [string, string][][] = [];

  for (let r = 0; r < rounds; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i]!;
      const b = arr[n - 1 - i]!;
      if (a !== "__BYE__" && b !== "__BYE__") pairs.push([a, b]);
    }
    result.push(pairs);
    const fixed = arr[0]!;
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return result;
}

export const roundRobinPlugin: StageTypePlugin = {
  type: "ROUND_ROBIN",
  runnable: true,
  validateConfig(stage) {
    const issues = [];
    if ((stage.groups ?? []).length < 1) {
      issues.push({
        path: `stages[${stage.order}].groups`,
        message: "Round Robin requires at least one group.",
      });
    }
    return issues;
  },
  generateMatches(ctx) {
    const matches: GeneratedMatch[] = [];
    let keyCounter = 0;

    for (const group of ctx.groups) {
      const rounds = circlePairings(group.teamIds);
      rounds.forEach((pairs, roundIdx) => {
        pairs.forEach(([a, b], pos) => {
          const key = `rr-${group.id}-r${roundIdx + 1}-p${pos + 1}-${keyCounter++}`;
          matches.push({
            key,
            roundNumber: roundIdx + 1,
            positionInRound: pos + 1,
            bracketSide: null,
            stageGroupId: group.id,
            status: "SCHEDULED",
            participants: [
              {
                slot: 0,
                tournamentTeamId: a,
                teamLabel: group.teamNames.get(a) ?? ctx.teamNames.get(a) ?? null,
              },
              {
                slot: 1,
                tournamentTeamId: b,
                teamLabel: group.teamNames.get(b) ?? ctx.teamNames.get(b) ?? null,
              },
            ],
          });
        });
      });
    }
    return matches;
  },
  computeStandings({ teamIds, teamNames, results }) {
    return applyResultsToStandings(teamIds, teamNames, results);
  },
};
