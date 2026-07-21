import type { GeneratedMatch, StageTypePlugin } from "@tournaments-leagues/domain/stages/types";
import { applyResultsToStandings } from "./standings-helpers";

/** Swiss v1: generate first round by adjacent seed pairing; later rounds via admin regenerate. */
export const swissPlugin: StageTypePlugin = {
  type: "SWISS",
  runnable: true,
  validateConfig(stage) {
    if ((stage.groups ?? []).length < 1) {
      return [
        {
          path: `stages[${stage.order}].groups`,
          message: "Swiss stages need at least one group.",
        },
      ];
    }
    return [];
  },
  generateMatches(ctx) {
    const matches: GeneratedMatch[] = [];
    let i = 0;
    for (const group of ctx.groups) {
      const ids = [...group.teamIds];
      for (let p = 0; p + 1 < ids.length; p += 2) {
        const a = ids[p]!;
        const b = ids[p + 1]!;
        matches.push({
          key: `swiss-${group.id}-r1-p${p / 2 + 1}-${i++}`,
          roundNumber: 1,
          positionInRound: p / 2 + 1,
          stageGroupId: group.id,
          bracketSide: null,
          status: "SCHEDULED",
          participants: [
            {
              slot: 0,
              tournamentTeamId: a,
              teamLabel: ctx.teamNames.get(a) ?? null,
            },
            {
              slot: 1,
              tournamentTeamId: b,
              teamLabel: ctx.teamNames.get(b) ?? null,
            },
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
