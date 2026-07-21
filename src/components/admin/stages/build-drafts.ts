import type { Graph } from "./types";
import { isElimType, normalizeTopBottomSelector } from "./graph-normalize";

export function buildDrafts(graph: Graph | null) {
  return (graph?.stages ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    stageType: s.stageType,
    matchFormat: s.matchFormat,
    seedingMethod: (s.seedingMethod === "RANDOM" ? "RANDOM" : "MANUAL") as
      | "MANUAL"
      | "RANDOM",
    seedSource: s.seedSource,
    feederStageIds: s.feederStageIds,
    finalsMatchFormat: isElimType(s.stageType)
      ? (s.finalsMatchFormat ?? "BO5")
      : null,
    finishesAt: s.finishesAt,
    resultWindowHours: s.resultWindowHours,
    groups: s.groups.map((g) => ({
      id: g.id,
      name: g.name,
      order: g.order,
      targetSize: g.targetSize,
      slots: g.slots.map((slot) => ({
        slotIndex: slot.slotIndex,
        teamId: slot.teamId,
        sourceStageId: slot.sourceStageId,
        sourceGroupId: slot.sourceGroupId,
        sourcePosition: slot.sourcePosition,
      })),
    })),
    rules: s.rules.map((r) => ({
      groupId: r.groupId,
      priority: r.priority,
      selector:
        r.selector.kind === "TOP_N" || r.selector.kind === "BOTTOM_N"
          ? normalizeTopBottomSelector(r.selector.kind, r.selector.n)
          : r.selector,
      destination: r.destination,
    })),
  }));
}
