import type { StageTypePlugin } from "@tournaments-leagues/domain/stages/types";
import { roundRobinPlugin } from "./round-robin";

/** League uses the same pairing as round robin (full season table). */
export const leaguePlugin: StageTypePlugin = {
  ...roundRobinPlugin,
  type: "LEAGUE",
  validateConfig(stage) {
    if ((stage.groups ?? []).length < 1) {
      return [
        {
          path: `stages[${stage.order}].groups`,
          message: "League stages need at least one group.",
        },
      ];
    }
    return [];
  },
};
