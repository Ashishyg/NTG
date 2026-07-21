import type { StageType } from "@prisma/client";
import type { AdminStageGraph } from "@tournaments-leagues/index";

export type SeedSource = "TEAMS" | "PREVIOUS_STAGE";

export type StageNode = {
  id: string;
  name: string;
  order: number;
  stageType: StageType;
  matchFormat: "BO1" | "BO3" | "BO5";
  finalsMatchFormat: "BO1" | "BO3" | "BO5" | null;
  finishesAt: string | null;
  resultWindowHours: number;
  seedingMethod: string;
  seedSource: SeedSource;
  /** When seedSource is PREVIOUS_STAGE — which earlier stages feed this one. */
  feederStageIds: string[];
  status: string;
  runnable: boolean;
  groups: {
    id: string;
    name: string;
    order: number;
    targetSize: number | null;
    slots: {
      id: string;
      slotIndex: number;
      teamId: string | null;
      teamName: string | null;
      sourceStageId: string | null;
      sourceGroupId: string | null;
      sourcePosition: number | null;
    }[];
  }[];
  rules: {
    id: string;
    groupId: string | null;
    priority: number;
    selector: { kind: string; n?: number; positions?: number[] };
    destination: {
      kind: string;
      stageId?: string;
      groupId?: string;
    };
  }[];
  seeding: { teamId: string; teamName: string; seed: number }[];
  matchCount: number;
  matches?: {
    id: string;
    roundNumber: number;
    positionInRound: number;
    bracketSide: string | null;
    status: string;
    stageGroupId: string | null;
    stageGroupName: string | null;
    scheduledAt?: string | null;
    scheduleStatus?: string;
    confirmedBySlot0?: boolean;
    confirmedBySlot1?: boolean;
    resultDeadlineAt?: string | null;
    participants: {
      slot: number;
      teamId: string | null;
      teamLabel: string | null;
    }[];
    result: {
      winnerSlot: number;
      scoreSummary: string | null;
      scoreA?: number | null;
      scoreB?: number | null;
      screenshotUrl?: string | null;
      games?: {
        winnerSlot: 0 | 1;
        scoreA?: number | null;
        scoreB?: number | null;
        screenshotUrl?: string | null;
      }[] | null;
    } | null;
  }[];
};

export type Graph = {
  stages: StageNode[];
  validation: { path: string; message: string }[];
};

export type StageDetailTabId =
  | "settings"
  | "pools"
  | "rules"
  | "matches";

export const STAGE_DETAIL_TABS: { id: StageDetailTabId; label: string }[] = [
  { id: "settings", label: "Stage Settings" },
  { id: "pools", label: "Teams & Pools" },
  { id: "rules", label: "Rules" },
  { id: "matches", label: "Matches & Results" },
];

export const STAGE_TYPES: { value: StageType; label: string }[] = [
  { value: "ROUND_ROBIN", label: "Round Robin" },
  { value: "SINGLE_ELIMINATION", label: "Single Elimination" },
  { value: "DOUBLE_ELIMINATION", label: "Double Elimination" },
  { value: "SWISS", label: "Swiss" },
  { value: "GSL", label: "GSL" },
  { value: "LEAGUE", label: "League" },
  { value: "FREE_FOR_ALL", label: "Free For All (soon)" },
  { value: "BATTLE_ROYALE", label: "Battle Royale (soon)" },
  { value: "CUSTOM", label: "Custom (soon)" },
];

export type AdminStageBuilderProps = {
  slug: string;
  teams: { id: string; name: string }[];
  initialGraph?: AdminStageGraph | null;
};
