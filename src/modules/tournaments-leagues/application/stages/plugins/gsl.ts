import type { GeneratedMatch, StageTypePlugin } from "@tournaments-leagues/domain/stages/types";
import { applyResultsToStandings } from "./standings-helpers";

/**
 * Classic 4-team GSL group:
 * Opening: 1v4, 2v3 → winners/losers matches → decider.
 */
export const gslPlugin: StageTypePlugin = {
  type: "GSL",
  runnable: true,
  validateConfig(stage) {
    const issues = [];
    for (const g of stage.groups ?? []) {
      const size = g.targetSize ?? g.slots?.length ?? 0;
      if (size > 0 && size !== 4) {
        issues.push({
          path: `stages[${stage.order}].groups[${g.order}]`,
          message: "GSL groups should have 4 teams.",
        });
      }
    }
    return issues;
  },
  generateMatches(ctx) {
    const matches: GeneratedMatch[] = [];

    for (const group of ctx.groups) {
      const ids = group.teamIds.slice(0, 4);
      while (ids.length < 4) ids.push(null as unknown as string);
      const [s1, s2, s3, s4] = ids;
      const label = (id: string | null) =>
        id ? ctx.teamNames.get(id) ?? null : null;

      const openingA: GeneratedMatch = {
        key: `gsl-${group.id}-oa`,
        roundNumber: 1,
        positionInRound: 1,
        stageGroupId: group.id,
        bracketSide: "opening",
        nextWinnerKey: `gsl-${group.id}-wb`,
        nextLoserKey: `gsl-${group.id}-lb`,
        status: s1 && s4 ? "SCHEDULED" : "BYE",
        participants: [
          { slot: 0, tournamentTeamId: s1 ?? null, teamLabel: label(s1 ?? null), seed: 1 },
          { slot: 1, tournamentTeamId: s4 ?? null, teamLabel: label(s4 ?? null), seed: 4 },
        ],
      };
      const openingB: GeneratedMatch = {
        key: `gsl-${group.id}-ob`,
        roundNumber: 1,
        positionInRound: 2,
        stageGroupId: group.id,
        bracketSide: "opening",
        nextWinnerKey: `gsl-${group.id}-wb`,
        nextLoserKey: `gsl-${group.id}-lb`,
        status: s2 && s3 ? "SCHEDULED" : "BYE",
        participants: [
          { slot: 0, tournamentTeamId: s2 ?? null, teamLabel: label(s2 ?? null), seed: 2 },
          { slot: 1, tournamentTeamId: s3 ?? null, teamLabel: label(s3 ?? null), seed: 3 },
        ],
      };
      const winners: GeneratedMatch = {
        key: `gsl-${group.id}-wb`,
        roundNumber: 2,
        positionInRound: 1,
        stageGroupId: group.id,
        bracketSide: "winners",
        status: "SCHEDULED",
        participants: [
          { slot: 0, tournamentTeamId: null, teamLabel: "Winner OA" },
          { slot: 1, tournamentTeamId: null, teamLabel: "Winner OB" },
        ],
      };
      const losers: GeneratedMatch = {
        key: `gsl-${group.id}-lb`,
        roundNumber: 2,
        positionInRound: 2,
        stageGroupId: group.id,
        bracketSide: "losers",
        nextWinnerKey: `gsl-${group.id}-dec`,
        status: "SCHEDULED",
        participants: [
          { slot: 0, tournamentTeamId: null, teamLabel: "Loser OA" },
          { slot: 1, tournamentTeamId: null, teamLabel: "Loser OB" },
        ],
      };
      const decider: GeneratedMatch = {
        key: `gsl-${group.id}-dec`,
        roundNumber: 3,
        positionInRound: 1,
        stageGroupId: group.id,
        bracketSide: "decider",
        status: "SCHEDULED",
        participants: [
          { slot: 0, tournamentTeamId: null, teamLabel: "Loser WB" },
          { slot: 1, tournamentTeamId: null, teamLabel: "Winner LB" },
        ],
      };

      matches.push(openingA, openingB, winners, losers, decider);
    }

    return matches;
  },
  computeStandings({ teamIds, teamNames, results }) {
    return applyResultsToStandings(teamIds, teamNames, results);
  },
};
