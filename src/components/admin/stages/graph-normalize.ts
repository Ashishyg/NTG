import type { StageType } from "@prisma/client";
import type { AdminStageGraph } from "@tournaments-leagues/index";
import { readFinalsFormat } from "@/modules/tournaments-leagues/application/stages/series-format";
import type { Graph, SeedSource, StageNode } from "./types";

export function isElimType(type: string) {
  return type === "SINGLE_ELIMINATION" || type === "DOUBLE_ELIMINATION";
}

export function localId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function normalizeTopBottomSelector(
  kind: "TOP_N" | "BOTTOM_N",
  n: number | undefined,
): { kind: "TOP_N" | "BOTTOM_N"; n: number } {
  const fallback = kind === "BOTTOM_N" ? 1 : 2;
  const value = typeof n === "number" && n > 0 ? n : fallback;
  return { kind, n: value };
}

function readSeedSource(config: unknown, order: number): SeedSource {
  if (config && typeof config === "object" && "seedSource" in config) {
    const v = (config as { seedSource?: string }).seedSource;
    if (v === "PREVIOUS_STAGE" || v === "TEAMS") return v;
  }
  return order > 1 ? "PREVIOUS_STAGE" : "TEAMS";
}

export function readFeederStageIds(config: unknown): string[] {
  if (!config || typeof config !== "object" || !("feederStageIds" in config)) {
    return [];
  }
  const v = (config as { feederStageIds?: unknown }).feederStageIds;
  if (!Array.isArray(v)) return [];
  return v.filter((id): id is string => typeof id === "string" && id.length > 0);
}

function readFinishesAt(config: unknown): string | null {
  if (config && typeof config === "object" && "finishesAt" in config) {
    const v = (config as { finishesAt?: string }).finishesAt;
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function readResultWindowHours(config: unknown): number {
  if (config && typeof config === "object" && "resultWindowHours" in config) {
    const v = Number((config as { resultWindowHours?: number }).resultWindowHours);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 3;
}

export function repairGraphPayload(data: AdminStageGraph): AdminStageGraph {
  // Keep destinations as configured — never silently rewrite Top→Playoffs into Stage 2.
  return data;
}

export function normalizeGraph(data: {
  stages: Array<{
    id: string;
    name: string;
    order: number;
    stageType: StageType;
    matchFormat: string;
    seedingMethod: string;
    status: string;
    runnable: boolean;
    config?: unknown;
    finishesAt?: string | null;
    resultWindowHours?: number;
    groups: StageNode["groups"];
    rules: Array<{
      id: string;
      groupId: string | null;
      priority: number;
      selector: unknown;
      destination: unknown;
    }>;
    seeding: StageNode["seeding"];
    matchCount: number;
    matches?: StageNode["matches"];
  }>;
  validation: Graph["validation"];
}): Graph {
  return {
    validation: data.validation,
    stages: data.stages.map((s) => {
      const matchFormat =
        s.matchFormat === "BO3" || s.matchFormat === "BO5" ? s.matchFormat : "BO1";
      return {
        id: s.id,
        name: s.name,
        order: s.order,
        stageType: s.stageType,
        matchFormat,
        seedSource: readSeedSource(s.config, s.order),
        feederStageIds: readFeederStageIds(s.config),
        finalsMatchFormat:
          readFinalsFormat(s.config) ?? (isElimType(s.stageType) ? "BO5" : null),
        finishesAt: readFinishesAt(s.config) ?? s.finishesAt ?? null,
        resultWindowHours:
          readResultWindowHours(s.config) || s.resultWindowHours || 3,
        seedingMethod: s.seedingMethod === "RANDOM" ? "RANDOM" : "MANUAL",
        status: s.status,
        runnable: s.runnable,
        groups: s.groups,
        rules: s.rules.map((r) => ({
          id: r.id,
          groupId: r.groupId,
          priority: r.priority,
          selector: (r.selector ?? {
            kind: "TOP_N",
            n: 2,
          }) as StageNode["rules"][number]["selector"],
          destination: (r.destination ?? {
            kind: "ELIMINATED",
          }) as StageNode["rules"][number]["destination"],
        })),
        seeding: s.seeding,
        matchCount: s.matchCount,
        matches: s.matches,
      };
    }),
  };
}

export function graphFromPayload(data: AdminStageGraph): Graph {
  return normalizeGraph(repairGraphPayload(data));
}
