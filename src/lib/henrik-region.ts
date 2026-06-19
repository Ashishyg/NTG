/** Henrik MMR v3 path regions (lowercase). */
export const HENRIK_MMR_REGIONS = ["ap", "na", "eu", "kr", "latam", "br"] as const;

export type HenrikMmrRegion = (typeof HENRIK_MMR_REGIONS)[number];

const VALID = new Set<string>(HENRIK_MMR_REGIONS);

/** Normalize account region for Henrik MMR endpoints; defaults to AP for Mangaluru lounge. */
export function normalizeHenrikRegion(region?: string | null): HenrikMmrRegion {
  const raw = region?.trim().toLowerCase();
  if (raw && VALID.has(raw)) return raw as HenrikMmrRegion;
  if (raw === "asia" || raw === "asia-pacific" || raw === "asia_pacific") return "ap";
  return "ap";
}

/** Regions to attempt for a single-player sync (primary first, then AP, then others). */
export function mmrRegionsToTry(storedRegion?: string | null): HenrikMmrRegion[] {
  const primary = normalizeHenrikRegion(storedRegion);
  const ordered: HenrikMmrRegion[] = [primary];
  if (primary !== "ap") ordered.push("ap");
  for (const r of HENRIK_MMR_REGIONS) {
    if (!ordered.includes(r)) ordered.push(r);
  }
  return ordered;
}
