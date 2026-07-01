import { LISTING_TRYOUT_GAME_KEYS, rosterPresetLabel } from "@/lib/roster-games";

export function normalizeTryoutGameKey(gameKey: string | null | undefined): string | null {
  const key = gameKey?.trim().toLowerCase();
  return key || null;
}

export function validateTryoutListingGame(
  gameKey: string | null | undefined,
): string | null {
  const normalized = normalizeTryoutGameKey(gameKey);
  if (!normalized) {
    return "Select a game for team tryouts.";
  }
  if (!LISTING_TRYOUT_GAME_KEYS.has(normalized)) {
    return "Tryouts are only available for Valorant and Counter-Strike 2 right now.";
  }
  return null;
}

export function tryoutGameConflictMessage(
  gameKey: string,
  existingSlug: string,
): string {
  return `A tryout listing for ${rosterPresetLabel(gameKey)} already exists (${existingSlug}). Only one tryout per game is allowed.`;
}
