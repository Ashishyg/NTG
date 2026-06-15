import type { GameSlug, PlacementRole, TournamentStatus } from "@prisma/client";

export type TournamentPlacementView = {
  role: PlacementRole;
  displayName: string;
  teamLabel: string | null;
};

export type TournamentMatchView = {
  id: string;
  roundNumber: number;
  positionInRound: number;
  status: string;
  scoreSummary: string | null;
  participants: { slot: number; label: string }[];
};

export type TournamentDetail = {
  id: string;
  slug: string;
  name: string;
  game: GameSlug;
  gameLabel: string | null;
  seasonLabel: string | null;
  status: TournamentStatus;
  startsAt: string | null;
  endsAt: string | null;
  prizePool: string | null;
  prizeNotes: string | null;
  registrationOpen: boolean;
  placements: TournamentPlacementView[];
  matches: TournamentMatchView[];
  registrationCount: number;
  userRegistered: boolean;
};
