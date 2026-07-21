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

export async function evaluateStageQualification(
  stageId: string,
): Promise<QualificationPlacement[]> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    include: {
      groups: { orderBy: { order: "asc" } },
      qualificationRules: { orderBy: { priority: "asc" } },
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

  for (const rule of stage.qualificationRules) {
    const selector = parseSelector(rule.selector);
    const rawDest = parseDestination(rule.destination);
    if (!selector || !rawDest) continue;

    const destination = resolveDestinationSync(
      rawDest,
      stage.order,
      tournamentStages,
    );
    if (destination.kind === "STAGE") {
      const exists = tournamentStages.some((s) => s.id === destination.stageId);
      if (!exists) continue;
    }

    const standings =
      rule.groupId != null
        ? (groupStandings.get(rule.groupId) ?? [])
        : stage.groups.length === 0
          ? (groupStandings.get("__stage__") ?? [])
          : [];

    // Stage-wide TOP_N across groups when no groupId: take top N from each group
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

function resolveDestinationSync(
  destination: Destination,
  fromOrder: number,
  tournamentStages: { id: string; order: number }[],
): Destination {
  if (destination.kind !== "STAGE" && destination.kind !== "STAGE_GROUP") {
    return destination;
  }

  const stageId = destination.stageId;
  const target = tournamentStages.find((s) => s.id === stageId);
  if (target && target.order > fromOrder) {
    return { kind: "STAGE", stageId: target.id };
  }

  const next = tournamentStages.find((s) => s.order === fromOrder + 1);
  if (next) return { kind: "STAGE", stageId: next.id };

  return destination.kind === "STAGE_GROUP"
    ? { kind: "STAGE", stageId: destination.stageId }
    : destination;
}
