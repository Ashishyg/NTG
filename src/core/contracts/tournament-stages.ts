export type StageTypePublic =
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "ROUND_ROBIN"
  | "SWISS"
  | "GSL"
  | "LEAGUE"
  | "FREE_FOR_ALL"
  | "BATTLE_ROYALE"
  | "CUSTOM";

export type StageStatusPublic = "DRAFT" | "READY" | "LIVE" | "COMPLETE";

export type StageMatchFormatPublic = "BO1" | "BO3" | "BO5";

export type SeedingMethodPublic =
  | "RANDOM"
  | "MANUAL"
  | "SNAKE"
  | "AUCTION_ORDER"
  | "PREVIOUS_TOURNAMENT"
  | "CURRENT_RANKING"
  | "DRAG_DROP";

export type StageGroupSlotPublic = {
  id: string;
  slotIndex: number;
  teamId: string | null;
  teamName: string | null;
  sourceStageId: string | null;
  sourceGroupId: string | null;
  sourcePosition: number | null;
  eliminated: boolean;
};

export type StageStandingPublic = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  roundDiff: number;
  roundsFor?: number;
  roundsAgainst?: number;
  position: number;
};

export type StageMatchPublic = {
  id: string;
  roundNumber: number;
  positionInRound: number;
  bracketSide: string | null;
  status: string;
  stageGroupId: string | null;
  matchFormat?: StageMatchFormatPublic | null;
  isFinal?: boolean;
  scheduledAt?: string | null;
  scheduleStatus?: string | null;
  participants: {
    slot: number;
    teamId: string | null;
    teamLabel: string | null;
    seed: number | null;
  }[];
  result: {
    winnerSlot: number;
    scoreSummary: string | null;
    scoreA?: number | null;
    scoreB?: number | null;
  } | null;
};

export type TournamentStageGroupPublic = {
  id: string;
  name: string;
  order: number;
  targetSize: number | null;
  slots: StageGroupSlotPublic[];
  standings: StageStandingPublic[];
};

export type StageQualificationRulePublic = {
  id: string;
  groupId: string | null;
  groupName: string | null;
  priority: number;
  /** Human-readable selector, e.g. "Top 2" / "Bottom 1" / "3rd & 4th" */
  selectorLabel: string;
  /** Human-readable destination, e.g. "advances to Stage 2" / "Eliminated" */
  destinationLabel: string;
  destinationKind: "STAGE" | "STAGE_GROUP" | "ELIMINATED" | "CHAMPION" | "LOWER_BRACKET" | "UNKNOWN";
};

export type TournamentStagePublicView = {
  id: string;
  name: string;
  order: number;
  stageType: StageTypePublic;
  matchFormat: StageMatchFormatPublic;
  /** SE/DE finals override when set. */
  finalsMatchFormat: StageMatchFormatPublic | null;
  seedingMethod: SeedingMethodPublic;
  status: StageStatusPublic;
  groups: TournamentStageGroupPublic[];
  matches: StageMatchPublic[];
  seeding: { teamId: string; teamName: string; seed: number }[];
  qualificationRules: StageQualificationRulePublic[];
};
