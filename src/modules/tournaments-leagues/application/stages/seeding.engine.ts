import type { SeedingMethod } from "@prisma/client";
import { prisma } from "@core/database/client";
import { GameSlug, LeaderboardScope } from "@prisma/client";

export type SeededTeam = { teamId: string; seed: number; name: string };

/**
 * Produce an ordered team list for a stage from the configured seeding method.
 */
export async function resolveStageSeeding(args: {
  tournamentId: string;
  stageId: string;
  method: SeedingMethod;
  teamIds?: string[];
}): Promise<SeededTeam[]> {
  const teams = await prisma.tournamentTeam.findMany({
    where: {
      tournamentId: args.tournamentId,
      ...(args.teamIds?.length ? { id: { in: args.teamIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      seed: true,
      sortOrder: true,
      createdAt: true,
      captainUserId: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (teams.length === 0) return [];

  const entriesForStage = async (): Promise<SeededTeam[]> => {
    const entries = await prisma.stageSeedingEntry.findMany({
      where: { stageId: args.stageId },
      orderBy: { seed: "asc" },
    });
    if (entries.length === 0) return [];
    const byId = new Map(teams.map((t) => [t.id, t]));
    return entries
      .map((e) => {
        const t = byId.get(e.teamId);
        if (!t) return null;
        return { teamId: t.id, seed: e.seed, name: t.name };
      })
      .filter((x): x is SeededTeam => Boolean(x));
  };

  switch (args.method) {
    case "MANUAL":
    case "DRAG_DROP": {
      const fromEntries = await entriesForStage();
      // Never fall back to the full cup roster — empty means "not seeded yet".
      return fromEntries;
    }
    case "AUCTION_ORDER":
      return teams.map((t, i) => ({
        teamId: t.id,
        seed: i + 1,
        name: t.name,
      }));
    case "RANDOM": {
      // Prefer this stage's seed list (e.g. qualifiers only) over the full cup roster.
      const fromEntries = await entriesForStage();
      const base =
        fromEntries.length > 0
          ? fromEntries
          : args.teamIds?.length
            ? teams.map((t, i) => ({ teamId: t.id, seed: i + 1, name: t.name }))
            : [];
      const shuffled = [...base];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      return shuffled.map((t, i) => ({ teamId: t.teamId, seed: i + 1, name: t.name }));
    }
    case "CURRENT_RANKING": {
      const captainIds = teams
        .map((t) => t.captainUserId)
        .filter((id): id is string => Boolean(id));
      const ranks = await prisma.leaderboardEntry.findMany({
        where: {
          userId: { in: captainIds },
          game: GameSlug.VALORANT,
          scope: LeaderboardScope.TOWN,
          seasonId: null,
        },
        select: { userId: true, mmr: true, rankTierId: true },
      });
      const rankByUser = new Map(ranks.map((r) => [r.userId, r]));
      const sorted = [...teams].sort((a, b) => {
        const ra = a.captainUserId ? rankByUser.get(a.captainUserId) : null;
        const rb = b.captainUserId ? rankByUser.get(b.captainUserId) : null;
        const ma = ra?.mmr ?? ra?.rankTierId ?? 0;
        const mb = rb?.mmr ?? rb?.rankTierId ?? 0;
        return mb - ma;
      });
      return sorted.map((t, i) => ({ teamId: t.id, seed: i + 1, name: t.name }));
    }
    case "PREVIOUS_TOURNAMENT":
    case "SNAKE":
    default:
      return teams.map((t, i) => ({
        teamId: t.id,
        seed: t.seed ?? i + 1,
        name: t.name,
      }));
  }
}

/** Distribute seeded teams into N groups using snake order. */
export function snakeDistribute(teamIds: string[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: Math.max(1, groupCount) }, () => []);
  let forward = true;
  let g = 0;
  for (const id of teamIds) {
    groups[g]!.push(id);
    if (forward) {
      if (g === groups.length - 1) forward = false;
      else g += 1;
    } else {
      if (g === 0) forward = true;
      else g -= 1;
    }
  }
  return groups;
}
