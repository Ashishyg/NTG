import { prisma } from "@core/database/client";
import {
  evaluateStageQualification,
  type QualificationPlacement,
} from "./qualification.engine";
import { generateMatchesForStage } from "./match-generation.engine";

function destinationTargetsStage(
  destination: QualificationPlacement["destination"],
  stageId: string,
  groupStageId?: string | null,
): boolean {
  if (destination.kind === "STAGE") return destination.stageId === stageId;
  if (destination.kind === "STAGE_GROUP") {
    return destination.stageId === stageId || groupStageId === stageId;
  }
  return false;
}

async function stageHasRecordedResults(stageId: string): Promise<boolean> {
  const hit = await prisma.matchResult.findFirst({
    where: { match: { bracket: { stageId } } },
    select: { id: true },
  });
  return hit != null;
}

async function clearStageRoster(stageId: string): Promise<void> {
  const groups = await prisma.tournamentStageGroup.findMany({
    where: { stageId },
    select: { id: true },
  });
  const groupIds = groups.map((g) => g.id);
  await prisma.stageSeedingEntry.deleteMany({ where: { stageId } });
  if (groupIds.length > 0) {
    await prisma.stageGroupSlot.updateMany({
      where: { groupId: { in: groupIds } },
      data: {
        teamId: null,
        eliminated: false,
        sourceStageId: null,
        sourceGroupId: null,
        sourcePosition: null,
      },
    });
  }
}

function destinationStageIds(placements: QualificationPlacement[]): string[] {
  const ids = new Set<string>();
  for (const p of placements) {
    if (p.destination.kind === "STAGE") ids.add(p.destination.stageId);
    if (p.destination.kind === "STAGE_GROUP") ids.add(p.destination.stageId);
  }
  return [...ids];
}

/**
 * Apply qualification placements: fill destination stage/group slots / mark eliminated.
 * STAGE destinations are re-seeded from ALL configured feeder stages (not only this one),
 * so Stage 3 can pull from Stage 1 + Stage 2 when both are selected as feeders.
 */
export async function applyStageMovement(stageId: string): Promise<{
  moved: number;
  eliminated: number;
  placements: QualificationPlacement[];
  populatedStageIds: string[];
}> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    select: { id: true, tournamentId: true },
  });
  if (!stage) {
    return { moved: 0, eliminated: 0, placements: [], populatedStageIds: [] };
  }

  const placements = await evaluateStageQualification(stageId);
  let moved = 0;
  let eliminated = 0;

  const destIds = destinationStageIds(placements);
  const clearable: string[] = [];
  for (const destId of destIds) {
    if (!(await stageHasRecordedResults(destId))) {
      clearable.push(destId);
    }
  }

  for (const p of placements) {
    if (p.destination.kind === "ELIMINATED") {
      if (p.groupId) {
        await prisma.stageGroupSlot.updateMany({
          where: { groupId: p.groupId, teamId: p.teamId },
          data: { eliminated: true },
        });
      }
      eliminated += 1;
      continue;
    }

    if (p.destination.kind === "LOWER_BRACKET") {
      continue;
    }

    if (p.destination.kind === "CHAMPION") {
      await prisma.tournamentPlacement.upsert({
        where: {
          tournamentId_role: {
            tournamentId: stage.tournamentId,
            role: "CHAMPION",
          },
        },
        create: {
          tournamentId: stage.tournamentId,
          role: "CHAMPION",
          teamLabel: p.teamName,
        },
        update: { teamLabel: p.teamName },
      });
      continue;
    }
  }

  // If playoffs/final stage has no explicit CHAMPION rule, set champion from
  // the completed final match winner when this is the last stage.
  const laterCount = await prisma.tournamentStage.count({
    where: {
      tournamentId: stage.tournamentId,
      order: {
        gt: (
          await prisma.tournamentStage.findUnique({
            where: { id: stageId },
            select: { order: true },
          })
        )?.order ?? 0,
      },
    },
  });
  if (laterCount === 0) {
    const hasChampRule = placements.some((p) => p.destination.kind === "CHAMPION");
    if (!hasChampRule) {
      const finalMatch = await prisma.match.findFirst({
        where: {
          bracket: { stageId },
          status: "COMPLETED",
          OR: [
            { bracketSide: "grand_final" },
            { nextWinnerMatchId: null, bracketSide: { not: "losers" } },
          ],
        },
        orderBy: [{ roundNumber: "desc" }, { positionInRound: "asc" }],
        include: {
          result: true,
          participants: true,
        },
      });
      if (finalMatch?.result) {
        const winner = finalMatch.participants.find(
          (p) => p.slot === finalMatch.result!.winnerSlot,
        );
        if (winner?.teamLabel || winner?.tournamentTeamId) {
          const teamName =
            winner.teamLabel ??
            (
              await prisma.tournamentTeam.findUnique({
                where: { id: winner.tournamentTeamId! },
                select: { name: true },
              })
            )?.name ??
            "Champion";
          await prisma.tournamentPlacement.upsert({
            where: {
              tournamentId_role: {
                tournamentId: stage.tournamentId,
                role: "CHAMPION",
              },
            },
            create: {
              tournamentId: stage.tournamentId,
              role: "CHAMPION",
              teamLabel: teamName,
            },
            update: { teamLabel: teamName },
          });
        }
      }
    }
  }

  // Mark complete before re-seeding destinations so this feeder counts.
  await prisma.tournamentStage.update({
    where: { id: stageId },
    data: { status: "COMPLETE" },
  });

  for (const destId of clearable) {
    await clearStageRoster(destId);
    const fed = await applyFeedersIntoStage(destId, { requireComplete: true });
    moved += fed.moved;
  }

  const populatedStageIds: string[] = [];
  for (const destId of clearable) {
    const teamCount = await prisma.stageSeedingEntry.count({
      where: { stageId: destId },
    });
    if (teamCount < 2) continue;
    try {
      await generateMatchesForStage(destId);
      populatedStageIds.push(destId);
    } catch {
      // Stage type may not be runnable yet — roster is still filled.
    }
  }

  return { moved, eliminated, placements, populatedStageIds };
}

/**
 * Undo destination seeding / generated brackets that were created when this
 * feeder stage completed. Safe only for destinations with no recorded results.
 */
export async function undoStageMovement(stageId: string): Promise<void> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    select: {
      id: true,
      tournamentId: true,
      order: true,
      qualificationRules: { select: { destination: true } },
    },
  });
  if (!stage) return;

  const destIds = new Set<string>();
  for (const r of stage.qualificationRules) {
    const d = r.destination as { kind?: string; stageId?: string };
    if (
      (d.kind === "STAGE" || d.kind === "STAGE_GROUP") &&
      typeof d.stageId === "string" &&
      d.stageId
    ) {
      destIds.add(d.stageId);
    }
  }

  // Also clear later stages that list this stage as an explicit feeder.
  const later = await prisma.tournamentStage.findMany({
    where: {
      tournamentId: stage.tournamentId,
      order: { gt: stage.order },
    },
    select: { id: true, config: true },
  });
  for (const s of later) {
    const feeders = readFeederStageIds(s.config);
    if (feeders.includes(stageId)) destIds.add(s.id);
  }

  for (const destId of destIds) {
    if (await stageHasRecordedResults(destId)) continue;
    await clearStageRoster(destId);
    const bracket = await prisma.bracket.findFirst({
      where: { stageId: destId },
      select: { id: true },
    });
    if (bracket) {
      await prisma.bracket.delete({ where: { id: bracket.id } });
    }
    await prisma.tournamentStage.update({
      where: { id: destId },
      data: { status: "DRAFT" },
    });
  }

  // Clear auto-champion if this was the last stage.
  const laterCount = await prisma.tournamentStage.count({
    where: {
      tournamentId: stage.tournamentId,
      order: { gt: stage.order },
    },
  });
  if (laterCount === 0) {
    await prisma.tournamentPlacement.deleteMany({
      where: { tournamentId: stage.tournamentId, role: "CHAMPION" },
    });
  }

  // Clear eliminated flags on this stage's group slots.
  const groups = await prisma.tournamentStageGroup.findMany({
    where: { stageId },
    select: { id: true },
  });
  if (groups.length > 0) {
    await prisma.stageGroupSlot.updateMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      data: { eliminated: false },
    });
  }
}

function readFeederStageIds(config: unknown): string[] {
  if (!config || typeof config !== "object" || !("feederStageIds" in config)) {
    return [];
  }
  const v = (config as { feederStageIds?: unknown }).feederStageIds;
  if (!Array.isArray(v)) return [];
  return v.filter((id): id is string => typeof id === "string" && id.length > 0);
}

/**
 * Pull qualifiers into a target stage from every allowed feeder whose rules
 * point here (e.g. Stage 1 Top→Stage 3 plus Stage 2 Top→Stage 3).
 */
export async function applyFeedersIntoStage(
  targetStageId: string,
  opts?: { requireComplete?: boolean },
): Promise<{
  moved: number;
  feederStageIds: string[];
  byFeeder: { stageId: string; stageName: string; count: number }[];
}> {
  const target = await prisma.tournamentStage.findUnique({
    where: { id: targetStageId },
    select: { id: true, tournamentId: true, order: true, config: true },
  });
  if (!target) {
    return { moved: 0, feederStageIds: [], byFeeder: [] };
  }

  const allowed = readFeederStageIds(target.config);
  const allowedSet = allowed.length > 0 ? new Set(allowed) : null;

  const earlier = await prisma.tournamentStage.findMany({
    where: {
      tournamentId: target.tournamentId,
      order: { lt: target.order },
    },
    orderBy: { order: "asc" },
    include: { qualificationRules: true },
  });

  const feeders = earlier.filter((s) => {
    if (allowedSet && !allowedSet.has(s.id)) return false;
    if (opts?.requireComplete && s.status !== "COMPLETE") return false;
    return s.qualificationRules.some((r) => {
      const d = r.destination as { kind?: string; stageId?: string };
      return (
        (d.kind === "STAGE" || d.kind === "STAGE_GROUP") &&
        d.stageId === targetStageId
      );
    });
  });

  let moved = 0;
  const byFeeder: { stageId: string; stageName: string; count: number }[] = [];

  for (const feeder of feeders) {
    const placements = await evaluateStageQualification(feeder.id);
    let count = 0;
    for (const p of placements) {
      if (p.destination.kind === "STAGE" && p.destination.stageId === targetStageId) {
        const ok = await placeTeamIntoStage(targetStageId, p.teamId, {
          sourceStageId: feeder.id,
          sourceGroupId: p.groupId,
          sourcePosition: p.position,
        });
        if (ok) {
          moved += 1;
          count += 1;
        }
        continue;
      }
      if (p.destination.kind === "STAGE_GROUP") {
        const group = await prisma.tournamentStageGroup.findUnique({
          where: { id: p.destination.groupId },
          select: { stageId: true },
        });
        if (!destinationTargetsStage(p.destination, targetStageId, group?.stageId)) {
          continue;
        }
        const ok = await placeTeamIntoGroup(p.destination.groupId, p.teamId, {
          sourceStageId: feeder.id,
          sourceGroupId: p.groupId,
          sourcePosition: p.position,
        });
        if (ok) {
          moved += 1;
          count += 1;
        }
      }
    }
    byFeeder.push({
      stageId: feeder.id,
      stageName: feeder.name,
      count,
    });
  }

  return {
    moved,
    feederStageIds: feeders.map((f) => f.id),
    byFeeder,
  };
}

async function placeTeamIntoStage(
  destStageId: string,
  teamId: string,
  meta: {
    sourceStageId: string;
    sourceGroupId: string | null;
    sourcePosition: number;
  },
): Promise<boolean> {
  const groups = await prisma.tournamentStageGroup.findMany({
    where: { stageId: destStageId },
    orderBy: { order: "asc" },
    include: { slots: { orderBy: { slotIndex: "asc" } } },
  });

  // Already present?
  for (const g of groups) {
    if (g.slots.some((s) => s.teamId === teamId)) return true;
  }

  // Prefer empty slots across groups (round-robin by filled count)
  if (groups.length > 0) {
    const ranked = [...groups].sort(
      (a, b) =>
        a.slots.filter((s) => s.teamId).length - b.slots.filter((s) => s.teamId).length ||
        a.order - b.order,
    );
    for (const g of ranked) {
      const empty = g.slots.find((s) => !s.teamId);
      if (empty) {
        await prisma.stageGroupSlot.update({
          where: { id: empty.id },
          data: {
            teamId,
            eliminated: false,
            sourceStageId: meta.sourceStageId,
            sourceGroupId: meta.sourceGroupId,
            sourcePosition: meta.sourcePosition,
          },
        });
        await ensureSeedingEntry(destStageId, teamId);
        return true;
      }
    }

    // No empty slots — append to the least-full group
    const g = ranked[0]!;
    const nextIndex =
      g.slots.reduce((max, s) => Math.max(max, s.slotIndex), -1) + 1;
    await prisma.stageGroupSlot.create({
      data: {
        groupId: g.id,
        slotIndex: nextIndex,
        teamId,
        sourceStageId: meta.sourceStageId,
        sourceGroupId: meta.sourceGroupId,
        sourcePosition: meta.sourcePosition,
      },
    });
    await prisma.tournamentStageGroup.update({
      where: { id: g.id },
      data: { targetSize: Math.max(g.targetSize ?? 0, nextIndex + 1) },
    });
    await ensureSeedingEntry(destStageId, teamId);
    return true;
  }

  // Stage has no groups — seeding list only
  await ensureSeedingEntry(destStageId, teamId);
  return true;
}

async function placeTeamIntoGroup(
  groupId: string,
  teamId: string,
  meta: {
    sourceStageId: string;
    sourceGroupId: string | null;
    sourcePosition: number;
  },
): Promise<boolean> {
  const group = await prisma.tournamentStageGroup.findUnique({
    where: { id: groupId },
    include: { slots: { orderBy: { slotIndex: "asc" } } },
  });
  if (!group) return false;
  if (group.slots.some((s) => s.teamId === teamId)) return true;

  let target = group.slots.find(
    (s) =>
      !s.teamId &&
      s.sourceStageId === meta.sourceStageId &&
      (meta.sourceGroupId == null || s.sourceGroupId === meta.sourceGroupId) &&
      s.sourcePosition === meta.sourcePosition,
  );
  if (!target) {
    target = group.slots.find((s) => !s.teamId);
  }

  if (target) {
    await prisma.stageGroupSlot.update({
      where: { id: target.id },
      data: {
        teamId,
        eliminated: false,
        sourceStageId: meta.sourceStageId,
        sourceGroupId: meta.sourceGroupId,
        sourcePosition: meta.sourcePosition,
      },
    });
  } else {
    const nextIndex =
      group.slots.reduce((max, s) => Math.max(max, s.slotIndex), -1) + 1;
    await prisma.stageGroupSlot.create({
      data: {
        groupId,
        slotIndex: nextIndex,
        teamId,
        sourceStageId: meta.sourceStageId,
        sourceGroupId: meta.sourceGroupId,
        sourcePosition: meta.sourcePosition,
      },
    });
  }

  await ensureSeedingEntry(group.stageId, teamId);
  return true;
}

async function ensureSeedingEntry(stageId: string, teamId: string): Promise<void> {
  const max = await prisma.stageSeedingEntry.aggregate({
    where: { stageId },
    _max: { seed: true },
  });
  await prisma.stageSeedingEntry.upsert({
    where: { stageId_teamId: { stageId, teamId } },
    create: {
      stageId,
      teamId,
      seed: (max._max.seed ?? 0) + 1,
    },
    update: {},
  });
}

/** Whether all matches in a stage are completed (or bye). */
export async function isStageMatchesComplete(stageId: string): Promise<boolean> {
  const bracket = await prisma.bracket.findUnique({
    where: { stageId },
    include: { matches: { select: { status: true } } },
  });
  if (!bracket || bracket.matches.length === 0) return false;
  return bracket.matches.every(
    (m) =>
      m.status === "COMPLETED" || m.status === "BYE" || m.status === "WALKOVER",
  );
}
