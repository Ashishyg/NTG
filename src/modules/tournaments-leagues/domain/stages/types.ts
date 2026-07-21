import type {
  SeedingMethod,
  StageMatchFormat,
  StageStatus,
  StageType,
} from "@prisma/client";

export type ValidationIssue = {
  path: string;
  message: string;
};

export type QualificationSelector =
  | { kind: "TOP_N"; n: number }
  | { kind: "BOTTOM_N"; n: number }
  | { kind: "POSITION"; positions: number[] }
  | { kind: "PERCENTAGE"; n: number }
  | { kind: "CUSTOM"; positions: number[] };

export type Destination =
  | { kind: "STAGE"; stageId: string }
  | { kind: "STAGE_GROUP"; stageId: string; groupId: string }
  | { kind: "ELIMINATED" }
  | { kind: "CHAMPION" }
  | { kind: "LOWER_BRACKET" };

export type QualificationRuleInput = {
  id?: string;
  groupId?: string | null;
  priority?: number;
  selector: QualificationSelector;
  destination: Destination;
};

export type StageGroupSlotInput = {
  id?: string;
  slotIndex: number;
  teamId?: string | null;
  sourceStageId?: string | null;
  sourceGroupId?: string | null;
  sourcePosition?: number | null;
};

export type StageGroupInput = {
  id?: string;
  name: string;
  order: number;
  targetSize?: number | null;
  slots?: StageGroupSlotInput[];
};

export type StageSeedingInput = {
  teamId: string;
  seed: number;
};

export type StageInput = {
  id?: string;
  name: string;
  order: number;
  stageType: StageType;
  matchFormat?: StageMatchFormat;
  seedingMethod?: SeedingMethod;
  status?: StageStatus;
  config?: unknown;
  tieBreakRules?: unknown;
  groups?: StageGroupInput[];
  rules?: QualificationRuleInput[];
  seeding?: StageSeedingInput[];
};

export type StageGraphInput = {
  stages: StageInput[];
};

export type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  /** Round difference (rounds for − rounds against). */
  roundDiff: number;
  roundsFor: number;
  roundsAgainst: number;
  position: number;
};

export type GeneratedMatchParticipant = {
  slot: number;
  tournamentTeamId?: string | null;
  teamLabel?: string | null;
  seed?: number | null;
  isBye?: boolean;
};

export type GeneratedMatch = {
  roundNumber: number;
  positionInRound: number;
  bracketSide?: string | null;
  stageGroupId?: string | null;
  status?: "SCHEDULED" | "BYE";
  participants: GeneratedMatchParticipant[];
  /** Temporary key for wiring nextWinner/nextLoser after persist */
  key: string;
  nextWinnerKey?: string | null;
  nextLoserKey?: string | null;
};

export type StageGenerateContext = {
  stageId: string;
  stageType: StageType;
  matchFormat: StageMatchFormat;
  groups: {
    id: string;
    name: string;
    order: number;
    teamIds: string[];
    teamNames: Map<string, string>;
  }[];
  seededTeamIds: string[];
  teamNames: Map<string, string>;
  config: unknown;
};

export type StageTypePlugin = {
  type: StageType;
  runnable: boolean;
  validateConfig: (stage: StageInput, allStages: StageInput[]) => ValidationIssue[];
  generateMatches: (ctx: StageGenerateContext) => GeneratedMatch[];
  computeStandings: (args: {
    teamIds: string[];
    teamNames: Map<string, string>;
    results: {
      teamAId: string;
      teamBId: string;
      winnerTeamId: string | null;
      isDraw?: boolean;
      scoreA?: number | null;
      scoreB?: number | null;
      scoreSummary?: string | null;
    }[];
  }) => StandingRow[];
};

export { type StageType, type SeedingMethod, type StageMatchFormat, type StageStatus };
