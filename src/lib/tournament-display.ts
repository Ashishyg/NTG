import type { GameSlug, TournamentStatus } from "@prisma/client";
import { siCounterstrike, siEa, siValorant } from "simple-icons";
import type { TournamentPreview } from "@core/contracts";

export type TournamentDisplay = {
  id: string;
  slug: string;
  name: string;
  game: string;
  season: string;
  date: string;
  status: "Hosted" | "Soon" | "Live" | "Open";
  iconPath: string;
  hex: string;
};

const gameMeta: Record<
  GameSlug,
  { iconPath: string; hex: string; label: string }
> = {
  VALORANT: { iconPath: siValorant.path, hex: `#${siValorant.hex}`, label: "Valorant" },
  CS2: { iconPath: siCounterstrike.path, hex: `#${siCounterstrike.hex}`, label: "Counter-Strike 2" },
  EA_FC26: { iconPath: siEa.path, hex: `#${siEa.hex}`, label: "EA FC 26" },
  OTHER: { iconPath: siValorant.path, hex: `#${siValorant.hex}`, label: "Other" },
};

function formatMonthYear(iso: string | null): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function mapDisplayStatus(status: TournamentStatus): TournamentDisplay["status"] {
  switch (status) {
    case "COMPLETED":
      return "Hosted";
    case "IN_PROGRESS":
      return "Live";
    case "REGISTRATION_OPEN":
      return "Open";
    default:
      return "Soon";
  }
}

export function toTournamentDisplay(t: TournamentPreview): TournamentDisplay {
  const meta = gameMeta[t.game] ?? gameMeta.OTHER;
  return {
    id: t.slug,
    slug: t.slug,
    name: t.name,
    game: t.gameLabel ?? meta.label,
    season: t.seasonLabel ?? "—",
    date: formatMonthYear(t.startsAt),
    status: mapDisplayStatus(t.status),
    iconPath: meta.iconPath,
    hex: meta.hex,
  };
}

export function gameMetaFor(slug: GameSlug) {
  return gameMeta[slug] ?? gameMeta.OTHER;
}
