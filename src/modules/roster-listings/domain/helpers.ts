import { GameSlug } from "@prisma/client";

const GAME_KEY_TO_SLUG: Record<string, GameSlug> = {
  valorant: GameSlug.VALORANT,
  cs2: GameSlug.CS2,
  "ea-fc": GameSlug.EA_FC26,
};

export function gameKeyToSlug(gameKey: string | null | undefined): GameSlug | null {
  if (!gameKey) return null;
  return GAME_KEY_TO_SLUG[gameKey.toLowerCase()] ?? null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
