import type { GameSlug } from "@prisma/client";

export type LeaderboardPreviewEntry = {
  rank: number;
  displayName: string;
  riotId: string | null;
  mmr: number | null;
  rankTier: string | null;
  rankTierId: number | null;
  peakMmr: number | null;
  lastSyncedAt: string | null;
  game: GameSlug;
};

export type LeaderboardPreview = {
  game: GameSlug;
  scope: string;
  entries: LeaderboardPreviewEntry[];
};
