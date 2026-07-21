import { prisma } from "@core/database/client";
import {
  parseDestination,
  parseSelector,
  resolveSelectorPositions,
} from "@tournaments-leagues/domain/stages/validation";
import { computeGroupStandings, computeBracketStageStandings } from "./standings.engine";
import type { Destination, StandingRow } from "@tournaments-leagues/domain/stages/types";

export type QualificationPlacement = {
  teamId: string;
  teamName: string;
  position: number;
  groupId: string | null;
  destination: Destination;
};

function destinationIsValidLaterStage(
  destination: Destination,
  fromOrder: number,
  tournamentStages: { id: string; order: number }[],
): boolean {
  if (destination.kind !== "STAGE" && destination.kind !== "STAGE_GROUP") {
    return true;
  }
  const target = tournamentStages.find((s) => s.id === destination.stageId);
  return Boolean(target && target.order > fromOrder);
}

export async function evaluateStageQualification(
  stageId: string,
): Promise<QualificationPlacement[]> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    include: {
      groups: { orderBy: { order: "asc" } },
      qualificationRules: { orderBy: [{ priority: "asc" }, { id: "asc" }] },
    },
  });
  if (!stage) return [];

  const tournamentStages = await prisma.tournamentStage.findMany({
    where: { tournamentId: stage.tournamentId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const placements: QualificationPlacement[] = [];
  const claimed = new Set<string>();

  const groupStandings = new Map<string, StandingRow[]>();
  if (stage.groups.length > 0) {
    for (const g of stage.groups) {
      groupStandings.set(g.id, await computeGroupStandings(stageId, g.id));
    }
  } else {
    const flat = await computeBracketStageStandings(stageId);
    groupStandings.set("__stage__", flat);
  }

  const liveGroupIds = new Set(stage.groups.map((g) => g.id));

  for (const rule of stage.qualificationRules) {
    const selector = parseSelector(rule.selector);
    const destination = parseDestination(rule.destination);
    if (!selector || !destination) continue;

    // Never invent a different destination — skip broken STAGE links.
    if (!destinationIsValidLaterStage(destination, stage.order, tournamentStages)) {
      continue;
    }

    // Stale groupId after pool rebuild → skip (don't silently match nothing for TOP
    // while BOTTOM "all groups" still runs).
    if (rule.groupId != null && !liveGroupIds.has(rule.groupId)) {
      continue;
    }

    const standings =
      rule.groupId != null
        ? (groupStandings.get(rule.groupId) ?? [])
        : stage.groups.length === 0
          ? (groupStandings.get("__stage__") ?? [])
          : [];

    // Stage-wide rule across groups when no groupId: apply selector per group.
    if (rule.groupId == null && stage.groups.length > 0) {
      for (const g of stage.groups) {
        const gs = groupStandings.get(g.id) ?? [];
        const positions = resolveSelectorPositions(selector, gs.length);
        for (const pos of positions) {
          const row = gs.find((s) => s.position === pos);
          if (!row || claimed.has(row.teamId)) continue;
          claimed.add(row.teamId);
          placements.push({
            teamId: row.teamId,
            teamName: row.teamName,
            position: pos,
            groupId: g.id,
            destination,
          });
        }
      }
      continue;
    }

    const positions = resolveSelectorPositions(selector, standings.length);
    for (const pos of positions) {
      const row = standings.find((s) => s.position === pos);
      if (!row || claimed.has(row.teamId)) continue;
      claimed.add(row.teamId);
      placements.push({
        teamId: row.teamId,
        teamName: row.teamName,
        position: pos,
        groupId: rule.groupId,
        destination,
      });
    }
  }

  return placements;
}
