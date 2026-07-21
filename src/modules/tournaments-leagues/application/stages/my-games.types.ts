import type { ScoreEntryMode, SeriesFormat, SeriesGame } from "./series-format";

/** Client-safe view of a player's match in Your Games. */
export type MyGameView = {
  matchId: string;
  stageId: string;
  stageName: string;
  stageOrder: number;
  stageFinishesAt: string | null;
  resultWindowHours: number;
  stageType: string | null;
  /** `rounds` for RR / Swiss / league; `series` for elimination. */
  scoreEntryMode: ScoreEntryMode;
  matchFormat: SeriesFormat;
  formatLabel: string;
  roundNumber: number;
  positionInRound: number;
  bracketSide: string | null;
  status: string;
  scheduledAt: string | null;
  scheduleStatus: string;
  confirmedBySlot0: boolean;
  confirmedBySlot1: boolean;
  resultDeadlineAt: string | null;
  mySlot: 0 | 1;
  myTeamId: string;
  myTeamName: string;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  iConfirmed: boolean;
  opponentConfirmed: boolean;
  canConfirm: boolean;
  canPropose: boolean;
  canSubmitResult: boolean;
  canEditResult: boolean;
  resultOverdue: boolean;
  result: {
    winnerSlot: number;
    scoreA: number | null;
    scoreB: number | null;
    scoreSummary: string | null;
    screenshotUrl: string | null;
    games: SeriesGame[] | null;
  } | null;
};
