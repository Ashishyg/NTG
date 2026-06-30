import { games } from "@/lib/data";
import { gameMetaFor } from "@/lib/tournament-display";
import type { GameSlug } from "@prisma/client";

export type RosterGamePlatform = "PC" | "Mobile" | "PS5";

export type RosterGamePreset = {
  key: string;
  label: string;
  platforms: RosterGamePlatform[];
};

export const ROSTER_GAME_PRESETS: RosterGamePreset[] = [
  { key: "valorant", label: "Valorant", platforms: ["PC"] },
  { key: "cs2", label: "Counter-Strike 2", platforms: ["PC"] },
  { key: "lol", label: "League of Legends", platforms: ["PC"] },
  { key: "dota2", label: "Dota 2", platforms: ["PC"] },
  { key: "fortnite", label: "Fortnite", platforms: ["PC", "PS5", "Mobile"] },
  { key: "apex", label: "Apex Legends", platforms: ["PC", "PS5"] },
  { key: "bgmi", label: "BGMI", platforms: ["Mobile"] },
  { key: "pubgm", label: "PUBG Mobile", platforms: ["Mobile"] },
  { key: "cod", label: "Call of Duty", platforms: ["PC", "PS5"] },
  { key: "ea-fc", label: "EA FC", platforms: ["PC", "PS5"] },
  { key: "clash-royale", label: "Clash Royale", platforms: ["Mobile"] },
  { key: "rocket-league", label: "Rocket League", platforms: ["PC", "PS5"] },
  { key: "overwatch2", label: "Overwatch 2", platforms: ["PC", "PS5"] },
  { key: "r6", label: "Rainbow Six Siege", platforms: ["PC", "PS5"] },
  { key: "tekken", label: "Tekken", platforms: ["PC", "PS5"] },
  { key: "street-fighter", label: "Street Fighter", platforms: ["PC", "PS5"] },
];

export const VALORANT_ROSTER_MAX_PLAYERS = 5;
export const CS2_ROSTER_MAX_PLAYERS = 5;
export const ROSTER_SLOT_MAX_PLAYERS = 5;

export function rosterPresetByKey(key: string): RosterGamePreset | undefined {
  return ROSTER_GAME_PRESETS.find((g) => g.key === key);
}

export function rosterPresetLabel(key: string, fallback?: string | null): string {
  return rosterPresetByKey(key)?.label ?? fallback ?? key;
}

export type RosterGameVisual = {
  iconPath: string;
  hex: string;
  label: string;
};

const ROSTER_KEY_ALIASES: Record<string, string> = {
  "ea-fc": "fc26",
  pubgm: "pubg",
};

const ROSTER_KEY_TO_GAME_SLUG: Record<string, GameSlug> = {
  valorant: "VALORANT",
  cs2: "CS2",
  fc26: "EA_FC26",
  "ea-fc": "EA_FC26",
};

export function rosterGameVisual(
  gameKey: string | null,
  fallbackLabel?: string | null,
): RosterGameVisual | null {
  if (!gameKey) return null;

  const key = gameKey.toLowerCase();
  const slugKey = ROSTER_KEY_ALIASES[key] ?? key;
  const gameSlug = ROSTER_KEY_TO_GAME_SLUG[key] ?? ROSTER_KEY_TO_GAME_SLUG[slugKey];

  if (gameSlug) {
    const meta = gameMetaFor(gameSlug);
    return {
      iconPath: meta.iconPath,
      hex: meta.hex,
      label: fallbackLabel ?? meta.label,
    };
  }

  const fromCatalog = games.find((g) => g.slug === slugKey || g.slug === key);
  if (fromCatalog) {
    return {
      iconPath: fromCatalog.path,
      hex: fromCatalog.hex,
      label: fallbackLabel ?? fromCatalog.name,
    };
  }

  if (fallbackLabel) {
    const other = gameMetaFor("OTHER");
    return { iconPath: other.iconPath, hex: "#5eead4", label: fallbackLabel };
  }

  return null;
}

export function listingSummary(description: string | null): string | null {
  if (!description?.trim()) return null;

  for (const raw of description.split("\n")) {
    const line = raw.trim();
    if (!line || /^\*\*/.test(line)) continue;
    const cleaned = line.replace(/[#*_`]/g, "").trim();
    if (cleaned.length > 12) {
      return cleaned.length > 140 ? `${cleaned.slice(0, 137)}…` : cleaned;
    }
  }

  return null;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

/** Apply alpha to a #RRGGBB (or #RGB) hex color. */
export function withHexAlpha(hex: string, alpha: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Site brand teal for listings without a game (jobs). */
export const LISTING_BRAND_ACCENT = "#5eead4";
