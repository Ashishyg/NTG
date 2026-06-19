import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { henrikFetch, henrikHeaders } from "@/lib/henrik-client";
import { mmrRegionsToTry, normalizeHenrikRegion } from "@/lib/henrik-region";
import { GameSlug, LeaderboardScope, Prisma } from "@prisma/client";

const PLATFORM = "pc";
/** Daily cron processes at most this many players per batch (~28 req/min with Henrik spacing). */
export const RANK_SYNC_MAX_BATCH_SIZE = 26;
const SYNC_RETRY_ATTEMPTS = 3;
const SYNC_RETRY_BASE_MS = 1_500;

export type MmrSnapshot = {
  mmr: number;
  rankTier: string;
  rankTierId: number;
  peakMmr: number;
  gameName?: string;
  tagLine?: string;
};

type HenrikV3MmrResponse = {
  status?: number;
  data?: {
    account?: { name?: string; tag?: string; puuid?: string };
    current?: {
      tier?: { id?: number; name?: string };
      rr?: number;
      elo?: number;
    };
    peak?: {
      tier?: { id?: number; name?: string };
    };
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseV3MmrBody(body: HenrikV3MmrResponse): MmrSnapshot | null {
  const current = body.data?.current;
  const tierId = current?.tier?.id;
  // Tier 0 / missing = unranked for current act
  if (tierId == null || tierId <= 0 || !current) return null;

  const mmr =
    current.elo ??
    (typeof current.rr === "number" ? estimateEloFromTier(tierId, current.rr) : null);
  if (mmr == null) return null;

  const rankTierId = tierId;
  const rankTier = current.tier?.name ?? "Unranked";
  const peakTierId = body.data?.peak?.tier?.id ?? rankTierId;
  const peakMmr = Math.max(
    mmr,
    peakTierId > rankTierId ? mmr + (peakTierId - rankTierId) * 40 : mmr,
  );

  return {
    mmr,
    rankTier,
    rankTierId,
    peakMmr,
    gameName: body.data?.account?.name,
    tagLine: body.data?.account?.tag,
  };
}

/** Rough MMR when Henrik omits `elo` but returns tier + RR. */
function estimateEloFromTier(tierId: number, rr: number): number {
  return tierId * 100 + rr;
}

async function fetchV3MmrByPuuid(
  region: string,
  puuid: string,
): Promise<MmrSnapshot | null> {
  const res = await henrikFetch(
    `https://api.henrikdev.xyz/valorant/v3/by-puuid/mmr/${region}/${PLATFORM}/${puuid}`,
    { headers: henrikHeaders(), next: { revalidate: 0 } },
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`MMR lookup failed (${res.status})`);
  }

  const body = (await res.json()) as HenrikV3MmrResponse;
  return parseV3MmrBody(body);
}

async function fetchV3MmrByName(
  region: string,
  gameName: string,
  tagLine: string,
): Promise<MmrSnapshot | null> {
  const encodedName = encodeURIComponent(gameName);
  const encodedTag = encodeURIComponent(tagLine);
  const res = await henrikFetch(
    `https://api.henrikdev.xyz/valorant/v3/mmr/${region}/${PLATFORM}/${encodedName}/${encodedTag}`,
    { headers: henrikHeaders(), next: { revalidate: 0 } },
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`MMR lookup failed (${res.status})`);
  }

  const body = (await res.json()) as HenrikV3MmrResponse;
  return parseV3MmrBody(body);
}

export async function fetchCompetitiveMmr(
  region: string,
  gameName: string,
  tagLine: string,
  puuid?: string,
  options?: { tryAllRegions?: boolean },
): Promise<{ snapshot: MmrSnapshot; region: string } | null> {
  const apiKey = serverEnv.henrikdevApiKey;

  if (!apiKey && process.env.NODE_ENV === "development") {
    const hash = `${gameName}${tagLine}`.length;
    const mmr = 1200 + (hash % 800);
    const tierId = 12 + (hash % 10);
    const tiers = [
      "Gold 1",
      "Gold 2",
      "Gold 3",
      "Platinum 1",
      "Platinum 2",
      "Platinum 3",
      "Diamond 1",
      "Diamond 2",
      "Diamond 3",
      "Ascendant 1",
    ];
    return {
      region: normalizeHenrikRegion(region),
      snapshot: {
        mmr,
        rankTier: tiers[hash % tiers.length]!,
        rankTierId: tierId,
        peakMmr: mmr + 120,
      },
    };
  }

  if (!apiKey) return null;

  const regions = options?.tryAllRegions
    ? mmrRegionsToTry(region)
    : [normalizeHenrikRegion(region)];

  for (const reg of regions) {
    try {
      if (puuid) {
        const byPuuid = await fetchV3MmrByPuuid(reg, puuid);
        if (byPuuid) return { snapshot: byPuuid, region: reg };
      }

      const byName = await fetchV3MmrByName(reg, gameName, tagLine);
      if (byName) return { snapshot: byName, region: reg };
    } catch {
      continue;
    }
  }

  return null;
}

export async function syncUserRank(
  userId: string,
  options?: { tryAllRegions?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });

  if (!user?.riotPuuid || !user.riotGameName || !user.riotTagLine) {
    return { ok: false, error: "Riot ID not linked." };
  }

  const region = normalizeHenrikRegion(user.riotRegion);

  let fetched: { snapshot: MmrSnapshot; region: string } | null;
  try {
    fetched = await fetchCompetitiveMmr(
      region,
      user.riotGameName,
      user.riotTagLine,
      user.riotPuuid,
      { tryAllRegions: options?.tryAllRegions ?? true },
    );
  } catch {
    return { ok: false, error: "Could not fetch rank from Riot." };
  }

  if (!fetched) {
    if (!serverEnv.henrikdevApiKey) {
      return { ok: false, error: "Rank sync is not configured (HENRIKDEV_API_KEY)." };
    }
    return { ok: false, error: "No competitive rank data found." };
  }

  const { snapshot, region: resolvedRegion } = fetched;

  if (snapshot.gameName && snapshot.tagLine) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        riotGameName: snapshot.gameName,
        riotTagLine: snapshot.tagLine,
        riotRegion: resolvedRegion,
      },
    });
  } else if (resolvedRegion !== user.riotRegion) {
    await prisma.user.update({
      where: { id: userId },
      data: { riotRegion: resolvedRegion },
    });
  }

  const existing = await prisma.leaderboardEntry.findFirst({
    where: {
      game: GameSlug.VALORANT,
      scope: "TOWN",
      seasonId: null,
      userId,
    },
  });

  const data = {
    mmr: snapshot.mmr,
    rankTier: snapshot.rankTier,
    rankTierId: snapshot.rankTierId,
    peakMmr: snapshot.peakMmr,
    lastSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.leaderboardEntry.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.leaderboardEntry.create({
      data: {
        game: GameSlug.VALORANT,
        scope: "TOWN",
        userId,
        ...data,
      },
    });
  }

  return { ok: true };
}

/** Prevents the same user from blocking overnight batches after retryable failures. */
async function markSyncAttempted(userId: string): Promise<void> {
  await prisma.leaderboardEntry.updateMany({
    where: {
      userId,
      game: GameSlug.VALORANT,
      scope: "TOWN",
      seasonId: null,
    },
    data: { lastSyncedAt: new Date() },
  });
}

const NON_RETRYABLE_ERRORS = new Set([
  "Riot ID not linked.",
  "No competitive rank data found.",
]);

async function syncUserRankWithRetry(
  userId: string,
  options?: { tryAllRegions?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  let last: { ok: false; error: string } = { ok: false, error: "Sync failed." };

  for (let attempt = 0; attempt < SYNC_RETRY_ATTEMPTS; attempt++) {
    const result = await syncUserRank(userId, options);
    if (result.ok) return result;

    last = result;
    if (NON_RETRYABLE_ERRORS.has(result.error)) return result;

    if (attempt < SYNC_RETRY_ATTEMPTS - 1) {
      await sleep(SYNC_RETRY_BASE_MS * (attempt + 1));
    }
  }

  return last;
}

type LinkedPlayerFilter = {
  fullRefreshBefore?: Date;
};

function linkedPlayerWhere(filter: LinkedPlayerFilter = {}): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = {
    signupCompleted: true,
    riotPuuid: { not: null },
    riotGameName: { not: null },
    riotTagLine: { not: null },
  };

  if (!filter.fullRefreshBefore) {
    return base;
  }

  return {
    ...base,
    OR: [
      {
        leaderboard: {
          none: { game: GameSlug.VALORANT, scope: LeaderboardScope.TOWN, seasonId: null },
        },
      },
      {
        leaderboard: {
          some: {
            game: GameSlug.VALORANT,
            scope: LeaderboardScope.TOWN,
            seasonId: null,
            lastSyncedAt: { lt: filter.fullRefreshBefore },
          },
        },
      },
    ],
  };
}

export type SyncAllResult = {
  synced: number;
  failed: number;
  skipped: number;
  hasMore: boolean;
  pending: number;
  batchSize: number;
};

export type SyncRunTotals = {
  synced: number;
  failed: number;
  skipped: number;
  batches: number;
};

export type LeaderboardSyncStats = {
  linkedPlayers: number;
  rankedOnLeaderboard: number;
  lastSyncedAt: string | null;
  cronScheduleIst: string;
};

const LINKED_PLAYER_WHERE: Prisma.UserWhereInput = {
  signupCompleted: true,
  riotPuuid: { not: null },
  riotGameName: { not: null },
  riotTagLine: { not: null },
};

export async function getLeaderboardSyncStats(): Promise<LeaderboardSyncStats> {
  const [linkedPlayers, rankedOnLeaderboard, lastEntry] = await Promise.all([
    prisma.user.count({ where: LINKED_PLAYER_WHERE }),
    prisma.leaderboardEntry.count({
      where: {
        game: GameSlug.VALORANT,
        scope: LeaderboardScope.TOWN,
        seasonId: null,
        mmr: { not: null },
      },
    }),
    prisma.leaderboardEntry.aggregate({
      where: {
        game: GameSlug.VALORANT,
        scope: LeaderboardScope.TOWN,
        seasonId: null,
      },
      _max: { lastSyncedAt: true },
    }),
  ]);

  return {
    linkedPlayers,
    rankedOnLeaderboard,
    lastSyncedAt: lastEntry._max.lastSyncedAt?.toISOString() ?? null,
    cronScheduleIst: "Daily 12:00 AM IST (18:30 UTC)",
  };
}

export async function syncAllLinkedPlayers(options?: {
  /** When set, only players not synced since this timestamp (daily full refresh). */
  fullRefreshBefore?: Date;
  maxBatchSize?: number;
  /** Try all Henrik regions per player (admin manual refresh). */
  tryAllRegions?: boolean;
}): Promise<SyncAllResult> {
  const maxBatchSize = Math.min(
    options?.maxBatchSize ?? RANK_SYNC_MAX_BATCH_SIZE,
    RANK_SYNC_MAX_BATCH_SIZE,
  );
  const where = linkedPlayerWhere({ fullRefreshBefore: options?.fullRefreshBefore });

  const [users, pendingBefore] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true },
      orderBy: { updatedAt: "asc" },
      take: maxBatchSize,
    }),
    prisma.user.count({ where }),
  ]);

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    const result = await syncUserRankWithRetry(user.id, {
      tryAllRegions: options?.tryAllRegions ?? false,
    });
    if (result.ok) synced += 1;
    else if (result.error === "No competitive rank data found.") skipped += 1;
    else {
      failed += 1;
      await markSyncAttempted(user.id).catch(() => {});
    }
  }

  const pending = Math.max(0, pendingBefore - users.length);

  return {
    synced,
    failed,
    skipped,
    hasMore: pending > 0,
    pending,
    batchSize: users.length,
  };
}

/** Run batched full refresh until all linked players are processed. */
export async function runFullLeaderboardSync(options?: {
  fullRefreshBefore?: Date;
  tryAllRegions?: boolean;
  onBatch?: (batch: SyncAllResult, totals: SyncRunTotals) => void;
}): Promise<SyncRunTotals & { complete: true }> {
  const runStartedAt = options?.fullRefreshBefore ?? new Date();
  const totals: SyncRunTotals = { synced: 0, failed: 0, skipped: 0, batches: 0 };

  let hasMore = true;
  while (hasMore) {
    const batch = await syncAllLinkedPlayers({
      fullRefreshBefore: runStartedAt,
      tryAllRegions: options?.tryAllRegions,
    });
    totals.synced += batch.synced;
    totals.failed += batch.failed;
    totals.skipped += batch.skipped;
    totals.batches += 1;
    options?.onBatch?.(batch, totals);
    hasMore = batch.hasMore;
  }

  return { ...totals, complete: true };
}
