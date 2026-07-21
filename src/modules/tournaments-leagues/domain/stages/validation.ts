import type { Destination, QualificationSelector, StageGraphInput, ValidationIssue } from "./types";

function isSelector(value: unknown): value is QualificationSelector {
  if (!value || typeof value !== "object") return false;
  const v = value as QualificationSelector;
  if (v.kind === "TOP_N" || v.kind === "BOTTOM_N" || v.kind === "PERCENTAGE") {
    return typeof v.n === "number" && v.n > 0;
  }
  if (v.kind === "POSITION" || v.kind === "CUSTOM") {
    return Array.isArray(v.positions) && v.positions.length > 0;
  }
  return false;
}

function isDestination(value: unknown): value is Destination {
  if (!value || typeof value !== "object") return false;
  const v = value as Destination;
  if (v.kind === "ELIMINATED" || v.kind === "CHAMPION" || v.kind === "LOWER_BRACKET") return true;
  if (v.kind === "STAGE") {
    return typeof v.stageId === "string" && v.stageId.length > 0;
  }
  if (v.kind === "STAGE_GROUP") {
    return typeof v.stageId === "string" && typeof v.groupId === "string";
  }
  return false;
}

export function parseSelector(raw: unknown): QualificationSelector | null {
  return isSelector(raw) ? raw : null;
}

export function parseDestination(raw: unknown): Destination | null {
  return isDestination(raw) ? raw : null;
}

/** Config-time validation for the full stage graph (DAG, destinations, basic sizes). */
export function validateStageGraph(graph: StageGraphInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const stages = graph.stages ?? [];
  if (stages.length === 0) return issues;

  const orders = new Set<number>();
  const stageIds = new Set<string>();
  const groupIds = new Map<string, string>(); // groupId -> stageId

  for (const stage of stages) {
    if (!stage.name?.trim()) {
      issues.push({ path: `stages[${stage.order}].name`, message: "Stage name is required." });
    }
    if (orders.has(stage.order)) {
      issues.push({ path: `stages[${stage.order}].order`, message: "Duplicate stage order." });
    }
    orders.add(stage.order);

    if (stage.id) stageIds.add(stage.id);

    for (const group of stage.groups ?? []) {
      if (group.id) groupIds.set(group.id, stage.id ?? `order:${stage.order}`);
      if (!group.name?.trim()) {
        issues.push({
          path: `stages[${stage.order}].groups[${group.order}].name`,
          message: "Group name is required.",
        });
      }
    }
  }

  // Destination references + DAG edges (by stage id when present)
  const edges: [string, string][] = [];

  for (const stage of stages) {
    const fromKey = stage.id ?? `order:${stage.order}`;
    for (const [ri, rule] of (stage.rules ?? []).entries()) {
      if (!isSelector(rule.selector)) {
        issues.push({
          path: `stages[${stage.order}].rules[${ri}].selector`,
          message: "Invalid qualification selector.",
        });
      }
      if (!isDestination(rule.destination)) {
        issues.push({
          path: `stages[${stage.order}].rules[${ri}].destination`,
          message: "Invalid destination.",
        });
        continue;
      }
      const dest = rule.destination;
      if (dest.kind === "STAGE" || dest.kind === "STAGE_GROUP") {
        const exists = stages.some((s) => s.id === dest.stageId);
        if (!exists && dest.stageId) {
          issues.push({
            path: `stages[${stage.order}].rules[${ri}].destination.stageId`,
            message: "Destination stage does not exist.",
          });
        }
        if (dest.kind === "STAGE_GROUP") {
          const groupExists = stages.some((s) =>
            (s.groups ?? []).some((g) => g.id === dest.groupId),
          );
          if (!groupExists) {
            issues.push({
              path: `stages[${stage.order}].rules[${ri}].destination.groupId`,
              message: "Destination group does not exist.",
            });
          }
        }
        edges.push([fromKey, dest.stageId]);
      }
    }
  }

  if (hasCycle(edges)) {
    issues.push({ path: "stages", message: "Stage graph contains a cycle." });
  }

  for (const stage of stages) {
    const groupCount = (stage.groups ?? []).length;
    if (
      (stage.stageType === "ROUND_ROBIN" || stage.stageType === "GSL" || stage.stageType === "LEAGUE") &&
      groupCount < 1
    ) {
      issues.push({
        path: `stages[${stage.order}].groups`,
        message: `${stage.stageType} stages need at least one group.`,
      });
    }
  }

  return issues;
}

function hasCycle(edges: [string, string][]): boolean {
  const adj = new Map<string, string[]>();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of adj.get(node) ?? []) {
      if (dfs(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of adj.keys()) {
    if (dfs(node)) return true;
  }
  return false;
}

/** Resolve which standing positions a selector picks (1-based). */
export function resolveSelectorPositions(
  selector: QualificationSelector,
  teamCount: number,
): number[] {
  if (teamCount <= 0) return [];
  switch (selector.kind) {
    case "TOP_N":
      return Array.from({ length: Math.min(selector.n, teamCount) }, (_, i) => i + 1);
    case "BOTTOM_N": {
      const n = Math.min(selector.n, teamCount);
      return Array.from({ length: n }, (_, i) => teamCount - n + 1 + i);
    }
    case "POSITION":
    case "CUSTOM":
      return selector.positions.filter((p) => p >= 1 && p <= teamCount);
    case "PERCENTAGE": {
      const n = Math.max(1, Math.ceil((teamCount * selector.n) / 100));
      return Array.from({ length: Math.min(n, teamCount) }, (_, i) => i + 1);
    }
    default:
      return [];
  }
}
