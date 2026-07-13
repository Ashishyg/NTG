/** Riot ID display limits (game name + # + tag line). */
export function riotIdSegmentLengths(riotId: string): { gameName: string; tagLine: string } | null {
  const idx = riotId.lastIndexOf("#");
  if (idx <= 0) return null;
  const gameName = riotId.slice(0, idx).trim();
  const tagLine = riotId.slice(idx + 1).trim();
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}

/** Accepts unicode game names and tag lines (e.g. Arsh#ツッツ). */
export function isValidRiotIdFormat(riotId: string): boolean {
  const parsed = riotIdSegmentLengths(riotId.trim());
  if (!parsed) return false;
  const nameLen = [...parsed.gameName].length;
  const tagLen = [...parsed.tagLine].length;
  return nameLen >= 3 && nameLen <= 16 && tagLen >= 3 && tagLen <= 5;
}
