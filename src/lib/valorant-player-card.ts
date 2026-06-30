/** Best horizontal strip URL for leaderboard row backgrounds. */
export function resolveLeaderboardCardArtUrl(
  wide?: string | null,
  large?: string | null,
): string | null {
  if (wide) return wide;
  if (!large) return null;

  if (large.includes("/wideart")) return large;
  if (large.includes("/largeart")) return large.replace("/largeart", "/wideart");
  if (large.includes("/smallart")) return large.replace("/smallart", "/wideart");

  return large;
}

/** Portrait player card art for roster tiles and profile displays. */
export function resolvePortraitCardArtUrl(
  large?: string | null,
  wide?: string | null,
): string | null {
  const normalizeToLarge = (url: string) => {
    if (url.includes("/wideart")) return url.replace("/wideart", "/largeart");
    if (url.includes("/smallart")) return url.replace("/smallart", "/largeart");
    return url;
  };

  if (large) return normalizeToLarge(large);
  if (!wide) return null;

  return normalizeToLarge(wide);
}

/** Persist wide + large together when Henrik omits wide. */
export function normalizeRiotPlayerCardUrls(
  large?: string | null,
  wide?: string | null,
): { large?: string; wide?: string } {
  const resolvedLarge = large ?? undefined;
  const resolvedWide =
    wide ?? (resolvedLarge ? resolveLeaderboardCardArtUrl(null, resolvedLarge) ?? undefined : undefined);

  return {
    ...(resolvedLarge ? { large: resolvedLarge } : {}),
    ...(resolvedWide ? { wide: resolvedWide } : {}),
  };
}
