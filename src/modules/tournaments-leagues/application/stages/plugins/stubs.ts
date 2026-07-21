import type { StageType, StageTypePlugin } from "@tournaments-leagues/domain/stages/types";
import { applyResultsToStandings, emptyStandings } from "./standings-helpers";

function stubPlugin(type: StageType): StageTypePlugin {
  return {
    type,
    runnable: false,
    validateConfig() {
      return [
        {
          path: "stageType",
          message: `${type} is not runnable yet — config can be saved but matches cannot be generated.`,
        },
      ];
    },
    generateMatches() {
      throw new Error(`${type} match generation is not implemented yet.`);
    },
    computeStandings({ teamIds, teamNames, results }) {
      if (results.length === 0) return emptyStandings(teamIds, teamNames);
      return applyResultsToStandings(teamIds, teamNames, results);
    },
  };
}

export const freeForAllPlugin = stubPlugin("FREE_FOR_ALL");
export const battleRoyalePlugin = stubPlugin("BATTLE_ROYALE");
export const customPlugin = stubPlugin("CUSTOM");
