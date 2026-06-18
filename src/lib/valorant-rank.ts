const RANK_NAMES = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Ascendant",
  "Immortal",
] as const;

/** Valorant competitive tier id → local rank badge filename (under /valorant/ranks/). */
export function rankIconFilename(tierId: number | null | undefined): string | null {
  if (tierId == null || tierId <= 0) return null;
  if (tierId >= 27) return "Radiant_Rank.png";

  const index = tierId - 3;
  if (index < 0) return null;

  const rankIndex = Math.floor(index / 3);
  const division = (index % 3) + 1;
  if (rankIndex >= RANK_NAMES.length) return null;

  return `${RANK_NAMES[rankIndex]}_${division}_Rank.png`;
}

export function rankIconUrl(tierId: number | null | undefined): string | null {
  const file = rankIconFilename(tierId);
  if (!file) return null;
  return `/valorant/ranks/${file}`;
}

/** Henrik/Riot `elo` ≈ (tierId − 3) × 100 + RR within tier (0–100). */
export function rankEloFromTier(tierId: number, rr = 50): number {
  if (tierId >= 27) return 2400 + rr;
  if (tierId < 3) return rr;
  return (tierId - 3) * 100 + rr;
}

export function formatRankLabel(
  tierId: number | null | undefined,
  tierName: string | null | undefined,
): string {
  if (tierName?.trim()) return tierName.trim();
  if (tierId == null || tierId <= 0) return "Unranked";
  return `Tier ${tierId}`;
}

export function tierBracket(tierId: number | null | undefined): string | null {
  if (tierId == null || tierId < 3) return null;
  if (tierId >= 27) return "RADIANT";
  if (tierId >= 24) return "IMMORTAL";
  if (tierId >= 21) return "ASCENDANT";
  if (tierId >= 18) return "DIAMOND";
  if (tierId >= 15) return "PLATINUM";
  if (tierId >= 12) return "GOLD";
  if (tierId >= 9) return "SILVER";
  if (tierId >= 6) return "BRONZE";
  return "IRON";
}

/** Minimum Henrik `elo` for the bottom of a rank bracket. */
export function bracketMinElo(bracket: string): number {
  const map: Record<string, number> = {
    RADIANT: 2400,
    IMMORTAL: 2100,
    ASCENDANT: 1800,
    DIAMOND: 1500,
    PLATINUM: 1200,
    GOLD: 900,
    SILVER: 600,
    BRONZE: 300,
    IRON: 0,
  };
  return map[bracket] ?? 0;
}

/** Accent color for rank tier row highlights. */
export function rankAccentClass(tierId: number | null | undefined): string {
  if (tierId == null || tierId <= 0) return "text-white/50";
  if (tierId >= 27) return "text-[#FF4655]"; // Radiant
  if (tierId >= 24) return "text-rose-300/90"; // Immortal
  if (tierId >= 21) return "text-emerald-300/90"; // Ascendant
  if (tierId >= 18) return "text-violet-300/90"; // Diamond
  if (tierId >= 15) return "text-cyan-300/80"; // Platinum
  if (tierId >= 12) return "text-amber-300/80"; // Gold
  if (tierId >= 9) return "text-slate-300/80"; // Silver
  if (tierId >= 6) return "text-orange-400/70"; // Bronze
  return "text-stone-400/70"; // Iron
}
