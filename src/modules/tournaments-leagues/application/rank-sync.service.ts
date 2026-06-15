import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { henrikFetch, henrikHeaders } from "@/lib/henrik-client";
import { GameSlug } from "@prisma/client";

const PLATFORM = "pc";
/** Stop cron batch before typical serverless limit; continuation via `after()`. */
const DEFAULT_CRON_BUDGET_MS = 100_000;
/** Cron every 6h — re-sync if older than ~5.5h (skips unchanged rows). */
const STALE_AFTER_MS = 5.5 * 60 * 60 * 1_000;

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

function parseV3MmrBody(body: HenrikV3MmrResponse): MmrSnapshot | null {
  const current = body.data?.current;
  if (!current?.tier?.id || current.elo == null) return null;

  const rankTierId = current.tier.id;
  const rankTier = current.tier.name ?? "Unranked";
  const mmr = current.elo;
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
): Promise<MmrSnapshot | null> {
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
      mmr,
      rankTier: tiers[hash % tiers.length]!,
      rankTierId: tierId,
      peakMmr: mmr + 120,
    };
  }

  if (!apiKey) return null;

  if (puuid) {
    const byPuuid = await fetchV3MmrByPuuid(region, puuid);
    if (byPuuid) return byPuuid;
  }

  return fetchV3MmrByName(region, gameName, tagLine);
}

export async function syncUserRank(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });

  if (!user?.riotPuuid || !user.riotGameName || !user.riotTagLine) {
    return { ok: false, error: "Riot ID not linked." };
  }

  const region = user.riotRegion ?? "ap";

  let snapshot: MmrSnapshot | null;
  try {
    snapshot = await fetchCompetitiveMmr(
      region,
      user.riotGameName,
      user.riotTagLine,
      user.riotPuuid,
    );
  } catch {
    return { ok: false, error: "Could not fetch rank from Riot." };
  }

  if (!snapshot) {
    return { ok: false, error: "No competitive rank data found." };
  }

  if (snapshot.gameName && snapshot.tagLine) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        riotGameName: snapshot.gameName,
        riotTagLine: snapshot.tagLine,
        riotRegion: region,
      },
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

export type SyncAllResult = {
  synced: number;
  failed: number;
  skipped: number;
  hasMore: boolean;
  pending: number;
};

export async function syncAllLinkedPlayers(options?: {
  staleOnly?: boolean;
  timeBudgetMs?: number;
}): Promise<SyncAllResult> {
  const staleOnly = options?.staleOnly ?? true;
  const deadline = Date.now() + (options?.timeBudgetMs ?? DEFAULT_CRON_BUDGET_MS);
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

  const users = await prisma.user.findMany({
    where: {
      signupCompleted: true,
      riotPuuid: { not: null },
      riotGameName: { not: null },
      riotTagLine: { not: null },
      ...(staleOnly
        ? {
            OR: [
              {
                leaderboard: {
                  none: { game: GameSlug.VALORANT, scope: "TOWN", seasonId: null },
                },
              },
              {
                leaderboard: {
                  some: {
                    game: GameSlug.VALORANT,
                    scope: "TOWN",
                    seasonId: null,
                    lastSyncedAt: { lt: staleBefore },
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
  });

  let synced = 0;
  let failed = 0;
  let skipped = 0;
  let processed = 0;
  let stoppedEarly = false;

  for (const user of users) {
    if (Date.now() >= deadline) {
      stoppedEarly = true;
      break;
    }

    const result = await syncUserRank(user.id);
    processed += 1;
    if (result.ok) synced += 1;
    else if (result.error === "No competitive rank data found.") skipped += 1;
    else failed += 1;
  }

  const pending = users.length - processed;

  return {
    synced,
    failed,
    skipped,
    hasMore: stoppedEarly && pending > 0,
    pending: stoppedEarly ? pending : 0,
  };
}
