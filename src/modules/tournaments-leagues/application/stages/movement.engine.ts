import { prisma } from "@core/database/client";
import {
  evaluateStageQualification,
  type QualificationPlacement,
} from "./qualification.engine";

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

/**
 * Apply qualification placements: fill destination stage/group slots / mark eliminated.
 * STAGE destinations add teams into the next stage (evenly across its pools).
 */
export async function applyStageMovement(stageId: string): Promise<{
  moved: number;
  eliminated: number;
  placements: QualificationPlacement[];
}> {
  const placements = await evaluateStageQualification(stageId);
  let moved = 0;
  let eliminated = 0;

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

    if (p.destination.kind === "CHAMPION" || p.destination.kind === "LOWER_BRACKET") {
      continue;
    }

    if (p.destination.kind === "STAGE") {
      const destStage = await prisma.tournamentStage.findUnique({
        where: { id: p.destination.stageId },
        select: { id: true },
      });
      if (!destStage) continue;

      const ok = await placeTeamIntoStage(p.destination.stageId, p.teamId, {
        sourceStageId: stageId,
        sourceGroupId: p.groupId,
        sourcePosition: p.position,
      });
      if (ok) moved += 1;
      continue;
    }

    if (p.destination.kind === "STAGE_GROUP") {
      const ok = await placeTeamIntoGroup(p.destination.groupId, p.teamId, {
        sourceStageId: stageId,
        sourceGroupId: p.groupId,
        sourcePosition: p.position,
      });
      if (ok) moved += 1;
    }
  }

  await prisma.tournamentStage.update({
    where: { id: stageId },
    data: { status: "COMPLETE" },
  });

  return { moved, eliminated, placements };
}

/**
 * Pull qualifiers into a target stage from EVERY earlier stage whose rules
 * point here (e.g. Stage 1 Top→Stage 3 plus Stage 2 Top→Stage 3).
 */
export async function applyFeedersIntoStage(targetStageId: string): Promise<{
  moved: number;
  feederStageIds: string[];
  byFeeder: { stageId: string; stageName: string; count: number }[];
}> {
  const target = await prisma.tournamentStage.findUnique({
    where: { id: targetStageId },
    select: { id: true, tournamentId: true, order: true },
  });
  if (!target) {
    return { moved: 0, feederStageIds: [], byFeeder: [] };
  }

  const earlier = await prisma.tournamentStage.findMany({
    where: {
      tournamentId: target.tournamentId,
      order: { lt: target.order },
    },
    orderBy: { order: "asc" },
    include: { qualificationRules: true },
  });

  const feeders = earlier.filter((s) =>
    s.qualificationRules.some((r) => {
      const d = r.destination as { kind?: string; stageId?: string };
      return (
        (d.kind === "STAGE" || d.kind === "STAGE_GROUP") &&
        d.stageId === targetStageId
      );
    }),
  );

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
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    select: { id: true },
  });
  if (!stage) return;

  const existing = await prisma.stageSeedingEntry.findUnique({
    where: { stageId_teamId: { stageId, teamId } },
  });
  if (existing) return;
  const max = await prisma.stageSeedingEntry.aggregate({
    where: { stageId },
    _max: { seed: true },
  });
  await prisma.stageSeedingEntry.create({
    data: {
      stageId,
      teamId,
      seed: (max._max.seed ?? 0) + 1,
    },
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
