import type { LeaderboardPreviewEntry } from "@core/contracts";

/** Henrik tier id for unranked / no current act rank. */
export const UNRANKED_TIER_ID = 0;

export function isRankedEntry(mmr: number | null | undefined): boolean {
  return mmr != null;
}

type SortableEntry = Pick<
  LeaderboardPreviewEntry,
  "rank" | "mmr" | "rankTierId" | "displayName"
>;

/**
 * Ranked players: MMR descending with ranks 1..n.
 * Unranked players: preserve stored board rank order (pre-reset positions).
 * When everyone is unranked, only stored rank order applies.
 */
export function sortValorantBoardEntries<T extends SortableEntry>(
  entries: T[],
): (T & { rank: number })[] {
  const ranked = entries
    .filter((e) => isRankedEntry(e.mmr))
    .sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));

  const unranked = entries
    .filter((e) => !isRankedEntry(e.mmr))
    .sort((a, b) => {
      const ar = a.rank ?? Number.MAX_SAFE_INTEGER;
      const br = b.rank ?? Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      return a.displayName.localeCompare(b.displayName);
    });

  if (ranked.length === 0) {
    return unranked.map((e) => ({
      ...e,
      rank: e.rank ?? 0,
    }));
  }

  const rankedRows = ranked.map((e, i) => ({
    ...e,
    rank: i + 1,
  }));

  const unrankedRows = unranked.map((e) => ({
    ...e,
    rank: e.rank ?? rankedRows.length + 1,
  }));

  return [...rankedRows, ...unrankedRows];
}
