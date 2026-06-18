import type { BracketType, GameSlug, TournamentStatus } from "@prisma/client";

export type RecordMatchResultInput = {
  matchId: string;
  winnerSlot: number;
  scoreSummary?: string;
};

export type CreateTournamentInput = {
  slug: string;
  name: string;
  game: GameSlug;
  gameLabel?: string;
  seasonId?: string;
  status?: TournamentStatus;
  format?: BracketType;
  registrationUrl?: string;
  hideAfter?: Date;
};
