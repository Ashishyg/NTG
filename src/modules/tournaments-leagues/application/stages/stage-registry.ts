import type { StageType, StageTypePlugin } from "@tournaments-leagues/domain/stages/types";
import { roundRobinPlugin } from "./plugins/round-robin";
import { singleEliminationPlugin } from "./plugins/single-elimination";
import { doubleEliminationPlugin } from "./plugins/double-elimination";
import { swissPlugin } from "./plugins/swiss";
import { gslPlugin } from "./plugins/gsl";
import { leaguePlugin } from "./plugins/league";
import {
  battleRoyalePlugin,
  customPlugin,
  freeForAllPlugin,
} from "./plugins/stubs";

const registry = new Map<StageType, StageTypePlugin>([
  [roundRobinPlugin.type, roundRobinPlugin],
  [singleEliminationPlugin.type, singleEliminationPlugin],
  [doubleEliminationPlugin.type, doubleEliminationPlugin],
  [swissPlugin.type, swissPlugin],
  [gslPlugin.type, gslPlugin],
  [leaguePlugin.type, leaguePlugin],
  [freeForAllPlugin.type, freeForAllPlugin],
  [battleRoyalePlugin.type, battleRoyalePlugin],
  [customPlugin.type, customPlugin],
]);

export function getStagePlugin(type: StageType): StageTypePlugin {
  const plugin = registry.get(type);
  if (!plugin) {
    throw new Error(`No stage plugin registered for ${type}`);
  }
  return plugin;
}

export function listStagePlugins(): StageTypePlugin[] {
  return [...registry.values()];
}

export function isStageTypeRunnable(type: StageType): boolean {
  return getStagePlugin(type).runnable;
}
