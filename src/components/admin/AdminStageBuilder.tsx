"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StageType } from "@prisma/client";
import type { AdminStageGraph } from "@tournaments-leagues/index";
import NativeEliminationBracket from "@/components/platform/tournament/NativeEliminationBracket";

type SeedSource = "TEAMS" | "PREVIOUS_STAGE";

type StageNode = {
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
    } | null;
  }[];
};

type Graph = {
  stages: StageNode[];
  validation: { path: string; message: string }[];
};

const STAGE_TYPES: { value: StageType; label: string }[] = [
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

type Props = {
  slug: string;
  teams: { id: string; name: string }[];
  initialGraph?: AdminStageGraph | null;
};

function repairGraphPayload(data: AdminStageGraph): AdminStageGraph {
  const stageById = new Map(data.stages.map((s) => [s.id, s]));
  const byOrder = new Map(data.stages.map((s) => [s.order, s]));
  return {
    ...data,
    stages: data.stages.map((stage) => {
      const fallback = byOrder.get(stage.order + 1);
      return {
        ...stage,
        rules: stage.rules.map((rule) => {
          const dest = rule.destination as { kind?: string; stageId?: string };
          if (dest?.kind !== "STAGE" && dest?.kind !== "STAGE_GROUP") return rule;
          const target = dest.stageId ? stageById.get(dest.stageId) : null;
          if (target && target.order > stage.order) return rule;
          if (fallback) {
            return { ...rule, destination: { kind: "STAGE", stageId: fallback.id } };
          }
          return rule;
        }),
      };
    }),
  };
}

function graphFromPayload(data: AdminStageGraph): Graph {
  return normalizeGraph(repairGraphPayload(data));
}

function readSeedSource(config: unknown, order: number): SeedSource {
  if (config && typeof config === "object" && "seedSource" in config) {
    const v = (config as { seedSource?: string }).seedSource;
    if (v === "PREVIOUS_STAGE" || v === "TEAMS") return v;
  }
  return order > 1 ? "PREVIOUS_STAGE" : "TEAMS";
}

function readFinalsFormat(config: unknown): "BO1" | "BO3" | "BO5" | null {
  if (config && typeof config === "object" && "finalsMatchFormat" in config) {
    const v = (config as { finalsMatchFormat?: string }).finalsMatchFormat;
    if (v === "BO1" || v === "BO3" || v === "BO5") return v;
  }
  return null;
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

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeTopBottomSelector(
  kind: "TOP_N" | "BOTTOM_N",
  n: number | undefined,
): { kind: "TOP_N" | "BOTTOM_N"; n: number } {
  const fallback = kind === "BOTTOM_N" ? 1 : 2;
  const value = typeof n === "number" && n > 0 ? n : fallback;
  return { kind, n: value };
}

function isElimType(type: string) {
  return type === "SINGLE_ELIMINATION" || type === "DOUBLE_ELIMINATION";
}

function normalizeGraph(data: {
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
          selector: (r.selector ?? { kind: "TOP_N", n: 2 }) as StageNode["rules"][number]["selector"],
          destination: (r.destination ?? { kind: "ELIMINATED" }) as StageNode["rules"][number]["destination"],
        })),
        seeding: s.seeding,
        matchCount: s.matchCount,
        matches: s.matches,
      };
    }),
  };
}

function localId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AdminStageBuilder({ slug, teams, initialGraph = null }: Props) {
  const [graph, setGraph] = useState<Graph | null>(() =>
    initialGraph ? graphFromPayload(initialGraph) : null,
  );
  const [loading, setLoading] = useState(!initialGraph);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialGraph?.stages[0]?.id ?? null,
  );
  const [newType, setNewType] = useState<StageType>("ROUND_ROBIN");
  const [savingMatchIds, setSavingMatchIds] = useState<Set<string>>(new Set());
  const [dragTeamId, setDragTeamId] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/stages`);
      const data = (await res.json()) as AdminStageGraph & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setGraph(graphFromPayload(data));
      setDirty(false);
      setSelectedId((prev) => prev ?? data.stages[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stages");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load({ silent: Boolean(initialGraph) });
  }, [load, initialGraph]);

  const selected = graph?.stages.find((s) => s.id === selectedId) ?? null;

  function patchSelected(mutator: (stage: StageNode) => StageNode) {
    if (!selectedId) return;
    setDirty(true);
    setGraph((g) => {
      if (!g) return g;
      return {
        ...g,
        stages: g.stages.map((s) => (s.id === selectedId ? mutator(s) : s)),
      };
    });
  }

  async function addStage() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Stage ${(graph?.stages.length ?? 0) + 1}`,
          stageType: newType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setGraph(graphFromPayload(data));
      setDirty(false);
      const last = data.stages[data.stages.length - 1];
      if (last) setSelectedId(last.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add stage");
    } finally {
      setBusy(false);
    }
  }

  async function removeStage(stageId: string) {
    if (!confirm("Delete this stage?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/stages/${stageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setGraph(graphFromPayload(data));
      setDirty(false);
      setSelectedId(data.stages[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  function setGroupCount(stage: StageNode, groupCount: number) {
    const assigned = stage.groups.flatMap((g) =>
      g.slots.filter((s) => s.teamId).map((s) => ({
        teamId: s.teamId!,
        teamName: s.teamName,
      })),
    );
    const buckets: { teamId: string; teamName: string | null }[][] = Array.from(
      { length: groupCount },
      () => [],
    );
    assigned.forEach((t, i) => {
      buckets[i % groupCount]!.push(t);
    });

    const oldOrderById = new Map(stage.groups.map((g) => [g.id, g.order]));
    const groups = Array.from({ length: groupCount }, (_, i) => {
      const existing = stage.groups[i];
      const bucket = buckets[i] ?? [];
      const size = Math.max(bucket.length, 2);
      return {
        id: existing?.id ?? localId("g"),
        name: existing?.name ?? `Pool ${String.fromCharCode(65 + i)}`,
        order: i + 1,
        targetSize: size,
        slots: Array.from({ length: size }, (_, si) => ({
          id: localId("slot"),
          slotIndex: si,
          teamId: bucket[si]?.teamId ?? null,
          teamName: bucket[si]?.teamName ?? null,
          sourceStageId: null,
          sourceGroupId: null,
          sourcePosition: null,
        })),
      };
    });

    const orderToNewId = new Map(groups.map((g) => [g.order, g.id]));
    const rules = stage.rules.map((r) => {
      if (!r.groupId) return r;
      const order = oldOrderById.get(r.groupId);
      return {
        ...r,
        groupId: order != null ? (orderToNewId.get(order) ?? null) : null,
      };
    });

    patchSelected((s) => ({ ...s, groups, rules }));
  }

  function defaultDestination(fromStage: StageNode): StageNode["rules"][number]["destination"] {
    const next = (graph?.stages ?? [])
      .filter((s) => s.order === fromStage.order + 1)
      .sort((a, b) => a.order - b.order)[0];
    if (next) return { kind: "STAGE", stageId: next.id };
    return { kind: "CHAMPION" };
  }

  function addRule(stage: StageNode) {
    patchSelected((s) => ({
      ...s,
      rules: [
        ...s.rules,
        {
          id: localId("rule"),
          groupId: stage.groups[0]?.id ?? null,
          priority: stage.rules.length,
          selector: { kind: "TOP_N", n: 2 },
          destination: defaultDestination(stage),
        },
      ],
    }));
  }

  function updateRule(ri: number, next: StageNode["rules"][number]) {
    patchSelected((s) => {
      const rules = [...s.rules];
      rules[ri] = next;
      return { ...s, rules };
    });
  }

  function removeRule(ri: number) {
    patchSelected((s) => ({
      ...s,
      rules: s.rules.filter((_, i) => i !== ri),
    }));
  }

  /** Fisher–Yates shuffle of current roster into pools (local preview). */
  function reshufflePools(stage: StageNode) {
    const fromSlots = stage.groups.flatMap((g) =>
      g.slots
        .filter((s) => s.teamId)
        .map((s) => ({
          teamId: s.teamId!,
          teamName: s.teamName ?? teamNameById.get(s.teamId!) ?? "Team",
        })),
    );
    const fromSeeds = stage.seeding.map((e) => ({
      teamId: e.teamId,
      teamName: e.teamName,
    }));
    const fromCup =
      stage.seedSource === "TEAMS"
        ? teams.map((t) => ({ teamId: t.id, teamName: t.name }))
        : [];

    const byId = new Map<string, string>();
    for (const t of [...fromCup, ...fromSeeds, ...fromSlots]) {
      byId.set(t.teamId, t.teamName);
    }
    const roster = [...byId.entries()].map(([teamId, teamName]) => ({
      teamId,
      teamName,
    }));
    if (roster.length === 0 || stage.groups.length === 0) return;

    for (let i = roster.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roster[i], roster[j]] = [roster[j]!, roster[i]!];
    }

    const groupCount = stage.groups.length;
    const buckets: { teamId: string; teamName: string }[][] = Array.from(
      { length: groupCount },
      () => [],
    );
    roster.forEach((t, i) => {
      buckets[i % groupCount]!.push(t);
    });

    patchSelected((s) => ({
      ...s,
      seedingMethod: "RANDOM",
      groups: s.groups.map((g, gi) => {
        const bucket = buckets[gi] ?? [];
        const size = Math.max(bucket.length, 2);
        return {
          ...g,
          targetSize: size,
          slots: Array.from({ length: size }, (_, si) => ({
            id: localId("slot"),
            slotIndex: si,
            teamId: bucket[si]?.teamId ?? null,
            teamName: bucket[si]?.teamName ?? null,
            sourceStageId: null,
            sourceGroupId: null,
            sourcePosition: null,
          })),
        };
      }),
    }));
  }

  const teamNameById = useMemo(() => {
    const m = new Map(teams.map((t) => [t.id, t.name]));
    for (const s of graph?.stages ?? []) {
      for (const g of s.groups) {
        for (const slot of g.slots) {
          if (slot.teamId && slot.teamName) m.set(slot.teamId, slot.teamName);
        }
      }
      for (const e of s.seeding) m.set(e.teamId, e.teamName);
    }
    return m;
  }, [teams, graph]);

  const rosterForSelected = useMemo(() => {
    if (!selected) return [] as { id: string; name: string }[];
    if (selected.seedSource === "TEAMS") {
      return teams.map((t) => ({ id: t.id, name: t.name }));
    }
    // Previous stage: show currently placed / seeded teams (after a prior Generate)
    const fromSlots = selected.groups.flatMap((g) =>
      g.slots
        .filter((s) => s.teamId)
        .map((s) => ({
          id: s.teamId!,
          name: s.teamName ?? teamNameById.get(s.teamId!) ?? "Team",
        })),
    );
    const fromSeeds = selected.seeding.map((e) => ({
      id: e.teamId,
      name: e.teamName,
    }));
    const merged = new Map<string, string>();
    for (const t of [...fromSeeds, ...fromSlots]) merged.set(t.id, t.name);
    return [...merged.entries()].map(([id, name]) => ({ id, name }));
  }, [selected, teams, teamNameById]);

  const assignedIds = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      selected.groups.flatMap((g) =>
        g.slots.map((s) => s.teamId).filter((id): id is string => Boolean(id)),
      ),
    );
  }, [selected]);

  const unassigned = useMemo(
    () => rosterForSelected.filter((t) => !assignedIds.has(t.id)),
    [rosterForSelected, assignedIds],
  );

  function moveTeamToPool(teamId: string, targetGroupId: string | "UNASSIGNED") {
    patchSelected((stage) => {
      const name = teamNameById.get(teamId) ?? "Team";
      const groups = stage.groups.map((g) => ({
        ...g,
        slots: g.slots
          .filter((s) => s.teamId !== teamId)
          .map((s, i) => ({ ...s, slotIndex: i })),
      }));

      if (targetGroupId === "UNASSIGNED") {
        return { ...stage, groups };
      }

      return {
        ...stage,
        groups: groups.map((g) => {
          if (g.id !== targetGroupId) return g;
          const slots = [
            ...g.slots,
            {
              id: localId("slot"),
              slotIndex: g.slots.length,
              teamId,
              teamName: name,
              sourceStageId: null,
              sourceGroupId: null,
              sourcePosition: null,
            },
          ];
          return {
            ...g,
            targetSize: Math.max(g.targetSize ?? 0, slots.length, 2),
            slots,
          };
        }),
      };
    });
  }

  function buildDrafts() {
    return (graph?.stages ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      stageType: s.stageType,
      matchFormat: s.matchFormat,
      seedingMethod: (s.seedingMethod === "RANDOM" ? "RANDOM" : "MANUAL") as
        | "MANUAL"
        | "RANDOM",
      seedSource: s.seedSource,
      finalsMatchFormat: isElimType(s.stageType)
        ? (s.finalsMatchFormat ?? "BO5")
        : null,
      finishesAt: s.finishesAt,
      resultWindowHours: s.resultWindowHours,
      groups: s.groups.map((g) => ({
        id: g.id,
        name: g.name,
        order: g.order,
        targetSize: g.targetSize,
        slots: g.slots.map((slot) => ({
          slotIndex: slot.slotIndex,
          teamId: slot.teamId,
          sourceStageId: slot.sourceStageId,
          sourceGroupId: slot.sourceGroupId,
          sourcePosition: slot.sourcePosition,
        })),
      })),
      rules: s.rules.map((r) => ({
        groupId: r.groupId,
        priority: r.priority,
        selector:
          r.selector.kind === "TOP_N" || r.selector.kind === "BOTTOM_N"
            ? normalizeTopBottomSelector(
                r.selector.kind,
                r.selector.n,
              )
            : r.selector,
        destination: r.destination,
      })),
    }));
  }

  async function generate(stageId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drafts: buildDrafts() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setGraph(graphFromPayload(data.graph));
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function syncPipeline() {
    if (
      !confirm(
        "Sync all stages?\n\nSaves your rules, re-pulls qualifiers Stage 1 → 2 → 3…, and rebuilds brackets that don’t have results yet.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setSyncNote(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/stages/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts: buildDrafts() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to sync");
      setGraph(graphFromPayload(data.graph));
      setDirty(false);
      const lines = (data.synced as Array<{
        name: string;
        teamCount: number;
        regenerated: boolean;
        skippedResults: boolean;
        byFeeder: { stageName: string; count: number }[];
      }>).map((s) => {
        const feed =
          s.byFeeder.length > 0
            ? s.byFeeder.map((f) => `${f.stageName}: ${f.count}`).join(", ")
            : "no feeders";
        const note = s.skippedResults
          ? "roster updated (kept existing results)"
          : s.regenerated
            ? "bracket regenerated"
            : "roster only";
        return `${s.name}: ${s.teamCount} teams (${feed}) — ${note}`;
      });
      setSyncNote(
        lines.length > 0
          ? lines.join("\n")
          : "No later stages to sync (add Stage 2+ with Previous stage).",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function setMatchWinner(matchId: string, winnerSlot: number) {
    if (!selectedId) return;
    setError(null);

    const stage = graph?.stages.find((s) => s.id === selectedId);
    const existing = stage?.matches?.find((m) => m.id === matchId);
    const clearing = existing?.result?.winnerSlot === winnerSlot;

    setSavingMatchIds((prev) => new Set(prev).add(matchId));
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/matches/${matchId}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clearing ? { clear: true } : { winnerSlot }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save result");
      // Reload so next-round slots (and losers bracket) reflect advancement
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save result");
      void load({ silent: true });
    } finally {
      setSavingMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }

  async function assignBracketTeam(
    matchId: string,
    slot: number,
    team: { id: string; name: string } | null,
  ) {
    setError(null);
    setSavingMatchIds((prev) => new Set(prev).add(matchId));
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/matches/${matchId}/participant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            team
              ? { slot, teamId: team.id, teamLabel: team.name }
              : { slot, teamId: null },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to assign team");
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign team");
    } finally {
      setSavingMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }

  async function reshuffleBracket(stageId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}/reshuffle`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reshuffle");
      setGraph(graphFromPayload(data.graph));
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reshuffle failed");
    } finally {
      setBusy(false);
    }
  }

  async function setMatchSchedule(
    matchId: string,
    scheduledAtLocal: string,
    forceConfirm = false,
  ) {
    setError(null);
    setSavingMatchIds((prev) => new Set(prev).add(matchId));
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/matches/${matchId}/schedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: new Date(scheduledAtLocal).toISOString(),
            forceConfirm,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to set schedule");
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set schedule");
    } finally {
      setSavingMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }

  if (loading && !graph) {
    return <p className="text-sm text-white/50">Loading stage builder…</p>;
  }

  const laterStagesForSelected =
    selected != null
      ? (graph?.stages ?? [])
          .filter((s) => s.order > selected.order)
          .sort((a, b) => a.order - b.order)
      : [];
  const previousStage =
    selected != null
      ? (graph?.stages ?? []).find((s) => s.order === selected.order - 1) ?? null
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">
          Stage Builder
        </h3>
        <p className="mt-1 text-sm text-white/45">
          Edit rules freely, then use <span className="text-white/70">Sync pipeline</span> to
          apply Stage 1 → 2 → 3… or <span className="text-white/70">Generate</span> on one stage.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {syncNote ? (
        <div className="whitespace-pre-wrap rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">
            Pipeline synced
          </p>
          {syncNote}
        </div>
      ) : null}

      {dirty ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
          Unsaved changes — press <span className="font-semibold">Generate</span> or{" "}
          <span className="font-semibold">Sync pipeline</span> to apply.
        </div>
      ) : null}

      {graph && graph.validation.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
            Validation
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            {graph.validation.map((v, i) => (
              <li key={i}>
                {v.message}{" "}
                <span className="text-amber-200/50">({v.path})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {graph && graph.stages.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100/90">
          <span className="font-bold uppercase tracking-wider text-cyan-300/80">Pipeline</span>
          {graph.stages.map((s, idx) => (
            <span key={s.id} className="flex items-center gap-2">
              {idx > 0 ? <span className="text-white/25">→</span> : null}
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`rounded-lg px-2 py-1 transition ${
                  selectedId === s.id
                    ? "bg-cyan-500/20 text-white"
                    : "text-cyan-100/70 hover:text-white"
                }`}
              >
                Stage {s.order}: {s.name}
              </button>
            </span>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncPipeline()}
            className="ml-auto rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-40"
          >
            Sync pipeline
            {busy ? "…" : ""}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {(graph?.stages ?? []).map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2">
            {idx > 0 ? <span className="text-white/25">↓</span> : null}
            <button
              type="button"
              onClick={() => setSelectedId(s.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                selectedId === s.id
                  ? "border-cyan-500/40 bg-cyan-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Stage {s.order}
              </p>
              <p className="text-sm font-semibold text-white">{s.name}</p>
              <p className="text-[10px] text-white/40">
                {s.stageType.replaceAll("_", " ")} · {s.status}
              </p>
            </button>
          </div>
        ))}
        {(graph?.stages.length ?? 0) === 0 ? (
          <p className="text-sm text-white/40">No stages yet — add one below.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <label className="flex flex-col gap-1 text-xs text-white/50">
          Format
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as StageType)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            {STAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void addStage()}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          + Add Stage
        </button>
      </div>

      {selected ? (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-[#0c0c0e] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[16rem] flex-1 space-y-3">
              <label className="block text-xs text-white/50">
                Stage name
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={selected.name}
                  onChange={(e) =>
                    patchSelected((s) => ({ ...s, name: e.target.value }))
                  }
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs text-white/50">
                  Format
                  <select
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={selected.stageType}
                    onChange={(e) => {
                      const stageType = e.target.value as StageType;
                      patchSelected((s) => ({
                        ...s,
                        stageType,
                        seedSource:
                          s.order > 1 ? "PREVIOUS_STAGE" : s.seedSource,
                        finalsMatchFormat: isElimType(stageType)
                          ? (s.finalsMatchFormat ?? "BO5")
                          : null,
                        matchFormat: isElimType(stageType)
                          ? s.matchFormat === "BO1"
                            ? "BO3"
                            : s.matchFormat
                          : s.matchFormat,
                      }));
                    }}
                  >
                    {STAGE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-white/50">
                  {isElimType(selected.stageType)
                    ? "Series format"
                    : "Match format"}
                  <select
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={selected.matchFormat}
                    onChange={(e) =>
                      patchSelected((s) => ({
                        ...s,
                        matchFormat: e.target.value as "BO1" | "BO3" | "BO5",
                      }))
                    }
                  >
                    <option value="BO1">BO1</option>
                    <option value="BO3">BO3</option>
                    <option value="BO5">BO5</option>
                  </select>
                </label>
                {isElimType(selected.stageType) ? (
                  <label className="block text-xs text-white/50">
                    Finals format
                    <select
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                      value={selected.finalsMatchFormat ?? "BO5"}
                      onChange={(e) =>
                        patchSelected((s) => ({
                          ...s,
                          finalsMatchFormat: e.target.value as
                            | "BO1"
                            | "BO3"
                            | "BO5",
                        }))
                      }
                    >
                      <option value="BO3">Final BO3</option>
                      <option value="BO5">Final BO5</option>
                      <option value="BO1">Final BO1</option>
                    </select>
                  </label>
                ) : null}
                <label className="block text-xs text-white/50">
                  Seed from
                  <select
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={selected.seedSource}
                    onChange={(e) =>
                      patchSelected((s) => ({
                        ...s,
                        seedSource: e.target.value as SeedSource,
                      }))
                    }
                  >
                    <option value="TEAMS">Cup teams ({teams.length})</option>
                    <option
                      value="PREVIOUS_STAGE"
                      disabled={!previousStage}
                    >
                      Previous stage (by rules)
                    </option>
                  </select>
                  {selected.seedSource === "PREVIOUS_STAGE" && previousStage ? (
                    <p className="mt-1 text-[11px] text-white/40">
                      Pulls qualifiers from{" "}
                      <span className="text-cyan-300/80">{previousStage.name}</span> using
                      its Top/Bottom/Position rules above.
                    </p>
                  ) : null}
                </label>
                <label className="block text-xs text-white/50">
                  Stage finishes by
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={toLocalDatetimeValue(selected.finishesAt)}
                    onChange={(e) =>
                      patchSelected((s) => ({
                        ...s,
                        finishesAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      }))
                    }
                  />
                </label>
                <label className="block text-xs text-white/50">
                  Result window (hours)
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={selected.resultWindowHours}
                    onChange={(e) =>
                      patchSelected((s) => ({
                        ...s,
                        resultWindowHours: Math.max(
                          1,
                          Number(e.target.value) || 3,
                        ),
                      }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-white/40">
                    Teams must submit result + screenshot within this many hours after the fixed
                    kickoff.
                  </p>
                </label>
                {!isElimType(selected.stageType) ||
                selected.groups.length > 0 ? (
                  <div className="block text-xs text-white/50">
                    Pool assignment
                    <div className="mt-1 flex items-center gap-1.5">
                      <select
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                        value={
                          selected.seedingMethod === "RANDOM"
                            ? "RANDOM"
                            : "MANUAL"
                        }
                        onChange={(e) => {
                          const method = e.target.value;
                          if (method === "RANDOM") {
                            reshufflePools({
                              ...selected,
                              seedingMethod: "RANDOM",
                            });
                          } else {
                            patchSelected((s) => ({
                              ...s,
                              seedingMethod: "MANUAL",
                            }));
                          }
                        }}
                      >
                        <option value="MANUAL">Manual (drag & drop)</option>
                        <option value="RANDOM">Randomizer</option>
                      </select>
                      {selected.seedingMethod === "RANDOM" ? (
                        <button
                          type="button"
                          title="Shuffle pools again"
                          aria-label="Shuffle pools again"
                          disabled={busy}
                          onClick={() => reshufflePools(selected)}
                          className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white/70 hover:border-white/25 hover:text-white disabled:opacity-40"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M21 12a9 9 0 1 1-2.6-6.3" />
                            <path d="M21 3v6h-6" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="block text-xs text-white/50">
                    Bracket seeding
                    <p className="mt-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/60">
                      Seed order from{" "}
                      {selected.seedSource === "PREVIOUS_STAGE"
                        ? "qualifiers"
                        : "cup teams"}
                    </p>
                  </div>
                )}
              </div>

              {selected.seedSource === "PREVIOUS_STAGE" ? (
                <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-100/90">
                  <span className="font-semibold text-cyan-200">Linked ← </span>
                  earlier stages whose rules send teams here
                  {" — "}
                  Generate / Sync pulls from <em>all</em> of them (not only{" "}
                  {previousStage?.name ?? "the previous stage"}).
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void removeStage(selected.id)}
              className="text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300"
            >
              Delete stage
            </button>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                Groups ({selected.groups.length})
              </p>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
                Count
                <select
                  disabled={busy}
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs font-semibold normal-case tracking-normal text-white"
                  value={Math.min(10, Math.max(1, selected.groups.length || 1))}
                  onChange={(e) => setGroupCount(selected, Number(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} group{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selected.seedingMethod === "RANDOM" ? (
              <p className="mb-3 text-xs text-white/40">
                Use the refresh button next to Randomizer to try different pool layouts. Generate
                locks in the current layout and builds matches.
              </p>
            ) : (
              <p className="mb-3 text-xs text-white/40">
                Drag teams into pools. Unassigned teams stay out of this stage until placed.
              </p>
            )}

            {selected.seedSource === "PREVIOUS_STAGE" && rosterForSelected.length === 0 ? (
              <p className="mb-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/80">
                Generate will pull only teams that meet the previous stage&apos;s qualification
                rules (e.g. Top 2 per pool) — not the full cup roster.
              </p>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {selected.seedingMethod !== "RANDOM" ? (
                <div
                  className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-sm"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = dragTeamId ?? e.dataTransfer.getData("text/team-id");
                    if (id) moveTeamToPool(id, "UNASSIGNED");
                    setDragTeamId(null);
                  }}
                >
                  <p className="font-semibold text-white/80">Unassigned</p>
                  <p className="text-[10px] text-white/35">
                    {unassigned.length} team{unassigned.length === 1 ? "" : "s"}
                  </p>
                  <ul className="mt-2 min-h-[3rem] space-y-1">
                    {unassigned.map((t) => (
                      <li
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          setDragTeamId(t.id);
                          e.dataTransfer.setData("text/team-id", t.id);
                        }}
                        onDragEnd={() => setDragTeamId(null)}
                        className="cursor-grab rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white/75 active:cursor-grabbing"
                      >
                        {t.name}
                      </li>
                    ))}
                    {unassigned.length === 0 ? (
                      <li className="text-xs text-white/30">None</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {selected.groups.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/70"
                  onDragOver={(e) => {
                    if (selected.seedingMethod !== "RANDOM") e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (selected.seedingMethod === "RANDOM") return;
                    e.preventDefault();
                    const id = dragTeamId ?? e.dataTransfer.getData("text/team-id");
                    if (id) moveTeamToPool(id, g.id);
                    setDragTeamId(null);
                  }}
                >
                  <p className="font-semibold text-white">{g.name}</p>
                  <p className="text-[10px] text-white/35">
                    {g.slots.filter((s) => s.teamId).length} placed
                  </p>
                  <ul className="mt-2 min-h-[3rem] space-y-1">
                    {g.slots
                      .filter((s) => s.teamId)
                      .map((s) => (
                        <li
                          key={s.id}
                          draggable={selected.seedingMethod !== "RANDOM"}
                          onDragStart={(e) => {
                            if (!s.teamId) return;
                            setDragTeamId(s.teamId);
                            e.dataTransfer.setData("text/team-id", s.teamId);
                          }}
                          onDragEnd={() => setDragTeamId(null)}
                          className={`rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white/75 ${
                            selected.seedingMethod !== "RANDOM"
                              ? "cursor-grab active:cursor-grabbing"
                              : ""
                          }`}
                        >
                          {s.teamName ?? teamNameById.get(s.teamId!) ?? "Team"}
                        </li>
                      ))}
                    {g.slots.every((s) => !s.teamId) ? (
                      <li className="text-xs text-white/30">
                        {selected.seedingMethod === "RANDOM"
                          ? "Filled on Generate"
                          : "Drop teams here"}
                      </li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                  Qualification rules
                </p>
                {laterStagesForSelected.length > 0 ? (
                  <p className="mt-0.5 text-[11px] text-white/45">
                    Top / Bottom / Position can send teams to any later stage (e.g. Stage 2, Stage
                    3).
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-white/45">
                    Final stage — use Champion or Eliminated for winners / losers.
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => addRule(selected)}
                className="text-[10px] font-bold uppercase tracking-wider text-cyan-400"
              >
                + Add rule
              </button>
            </div>
            <div className="space-y-2">
              {selected.rules.length === 0 ? (
                <p className="text-sm text-white/35">
                  No rules — Top / Bottom / Position send teams to a later stage (or Champion /
                  Eliminated).
                </p>
              ) : null}
              {laterStagesForSelected.length === 0 ? (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/80">
                  This is the last stage — add another stage above if you need a further round.
                </p>
              ) : null}
              {selected.rules.map((rule, ri) => {
                const otherStages = laterStagesForSelected;
                const maxPos = Math.max(
                  8,
                  ...selected.groups.map((g) => g.slots.length || g.targetSize || 0),
                );
                const selectedPositions =
                  rule.selector.kind === "POSITION"
                    ? (rule.selector.positions ?? [])
                    : [];
                const resolvedStageId =
                  rule.destination.kind === "STAGE" ||
                  rule.destination.kind === "STAGE_GROUP"
                    ? (otherStages.find((s) => s.id === rule.destination.stageId)?.id ??
                        otherStages[0]?.id)
                    : undefined;
                const destValue = resolvedStageId
                  ? `s:${resolvedStageId}`
                  : rule.destination.kind;

                return (
                  <div
                    key={rule.id}
                    className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-white/70"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="rounded border border-white/10 bg-black/40 px-2 py-1"
                        value={rule.groupId ?? ""}
                        onChange={(e) =>
                          updateRule(ri, {
                            ...rule,
                            groupId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">All groups</option>
                        {selected.groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded border border-white/10 bg-black/40 px-2 py-1"
                        value={
                          rule.selector.kind === "BOTTOM_N"
                            ? "BOTTOM_N"
                            : rule.selector.kind === "POSITION"
                              ? "POSITION"
                              : "TOP_N"
                        }
                        onChange={(e) => {
                          const kind = e.target.value;
                          updateRule(ri, {
                            ...rule,
                            selector:
                              kind === "POSITION"
                                ? {
                                    kind: "POSITION",
                                    positions: selectedPositions.length
                                      ? selectedPositions
                                      : [3, 4],
                                  }
                                : {
                                    kind,
                                    n:
                                      rule.selector.n ??
                                      (kind === "BOTTOM_N" ? 1 : 2),
                                  },
                          });
                        }}
                      >
                        <option value="TOP_N">Top</option>
                        <option value="BOTTOM_N">Bottom</option>
                        <option value="POSITION">Position</option>
                      </select>
                      {(rule.selector.kind === "TOP_N" ||
                        rule.selector.kind === "BOTTOM_N") && (
                        <input
                          type="number"
                          min={1}
                          className="w-14 rounded border border-white/10 bg-black/40 px-2 py-1"
                          value={
                            rule.selector.n != null ? String(rule.selector.n) : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              updateRule(ri, {
                                ...rule,
                                selector: { kind: rule.selector.kind },
                              });
                              return;
                            }
                            const parsed = Number.parseInt(raw, 10);
                            if (!Number.isFinite(parsed)) return;
                            updateRule(ri, {
                              ...rule,
                              selector: {
                                kind: rule.selector.kind,
                                n: parsed,
                              },
                            });
                          }}
                          onBlur={() => {
                            if (
                              rule.selector.kind !== "TOP_N" &&
                              rule.selector.kind !== "BOTTOM_N"
                            ) {
                              return;
                            }
                            if (rule.selector.n == null || rule.selector.n < 1) {
                              updateRule(ri, {
                                ...rule,
                                selector: normalizeTopBottomSelector(
                                  rule.selector.kind,
                                  rule.selector.n,
                                ),
                              });
                            }
                          }}
                        />
                      )}
                      <span className="text-white/30">→</span>
                      <select
                        className="min-w-[10rem] rounded border border-white/10 bg-black/40 px-2 py-1"
                        value={destValue}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "ELIMINATED" || v === "CHAMPION") {
                            updateRule(ri, { ...rule, destination: { kind: v } });
                          } else if (v.startsWith("s:")) {
                            updateRule(ri, {
                              ...rule,
                              destination: { kind: "STAGE", stageId: v.slice(2) },
                            });
                          }
                        }}
                      >
                        {otherStages.length > 0 ? (
                          <optgroup label="Later stages">
                            {otherStages.map((s) => (
                              <option key={s.id} value={`s:${s.id}`}>
                                {s.name} (Stage {s.order})
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        <optgroup label="End / remove">
                          <option value="CHAMPION">Champion</option>
                          <option value="ELIMINATED">Eliminated</option>
                        </optgroup>
                      </select>
                      <button
                        type="button"
                        className="ml-auto text-rose-400"
                        onClick={() => removeRule(ri)}
                      >
                        ×
                      </button>
                    </div>
                    {rule.selector.kind === "POSITION" ? (
                      <div className="flex flex-wrap items-center gap-1.5 pl-1">
                        <span className="mr-1 text-[10px] uppercase tracking-wider text-white/35">
                          Places
                        </span>
                        {Array.from({ length: maxPos }, (_, i) => i + 1).map((pos) => {
                          const on = selectedPositions.includes(pos);
                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => {
                                const positions = on
                                  ? selectedPositions.filter((p) => p !== pos)
                                  : [...selectedPositions, pos].sort((a, b) => a - b);
                                if (positions.length === 0) return;
                                updateRule(ri, {
                                  ...rule,
                                  selector: { kind: "POSITION", positions },
                                });
                              }}
                              className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                                on
                                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                                  : "border-white/10 bg-black/30 text-white/45 hover:text-white/80"
                              }`}
                            >
                              {pos}
                              {pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th"}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              disabled={busy || !selected.runnable}
              onClick={() => void generate(selected.id)}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              Generate
              {selected.matchCount ? ` · ${selected.matchCount} matches` : ""}
            </button>
            <ul className="space-y-1 text-[11px] leading-relaxed text-white/40">
              <li>
                Saves this stage&apos;s setup (and other buffered stages), seeds from{" "}
                <span className="text-white/60">
                  {selected.seedSource === "PREVIOUS_STAGE"
                    ? "previous-stage qualifiers"
                    : "cup teams"}
                </span>
                , then builds matches.
              </li>
              <li>
                For Stage 2+, choose <span className="text-white/60">Previous stage</span> so only
                Top/Bottom/Position qualifiers advance — not all {teams.length} teams.
              </li>
            </ul>
          </div>

          {(selected.matches?.length ?? 0) > 0 ? (
            <div className="border-t border-white/[0.06] pt-4 space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">
                  Match schedules
                </p>
                <p className="mb-3 text-[11px] text-white/40">
                  Set initial Date + time. Both teams confirm in Your Games. Use Force confirm to
                  lock without waiting.
                </p>
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {(selected.matches ?? [])
                    .filter((m) => m.status !== "BYE")
                    .slice(0, 40)
                    .map((m) => {
                      const a = m.participants.find((p) => p.slot === 0);
                      const b = m.participants.find((p) => p.slot === 1);
                      return (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-white/70"
                        >
                          <span className="min-w-[10rem] truncate text-white/80">
                            {a?.teamLabel ?? "TBD"} vs {b?.teamLabel ?? "TBD"}
                          </span>
                          <input
                            type="datetime-local"
                            className="rounded border border-white/10 bg-black/40 px-2 py-1 text-white"
                            defaultValue={toLocalDatetimeValue(m.scheduledAt)}
                            id={`sched-${m.id}`}
                          />
                          <button
                            type="button"
                            disabled={savingMatchIds.has(m.id)}
                            className="rounded bg-cyan-700/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-40"
                            onClick={() => {
                              const el = document.getElementById(
                                `sched-${m.id}`,
                              ) as HTMLInputElement | null;
                              if (!el?.value) return;
                              void setMatchSchedule(m.id, el.value, false);
                            }}
                          >
                            Set
                          </button>
                          <button
                            type="button"
                            disabled={savingMatchIds.has(m.id)}
                            className="rounded border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70 disabled:opacity-40"
                            onClick={() => {
                              const el = document.getElementById(
                                `sched-${m.id}`,
                              ) as HTMLInputElement | null;
                              if (!el?.value) return;
                              void setMatchSchedule(m.id, el.value, true);
                            }}
                          >
                            Force confirm
                          </button>
                          <span className="text-[10px] uppercase tracking-wider text-white/35">
                            {m.scheduleStatus ?? "UNSET"}
                            {m.confirmedBySlot0 || m.confirmedBySlot1
                              ? ` · ${m.confirmedBySlot0 ? "A✓" : "A…"}/${m.confirmedBySlot1 ? "B✓" : "B…"}`
                              : ""}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
                {isElimType(selected.stageType)
                  ? "Bracket"
                  : "Match results (manual)"}
              </p>
              {isElimType(selected.stageType) ? (
                <NativeEliminationBracket
                  matches={(selected.matches ?? []).map((m) => {
                    const winnersMax = Math.max(
                      1,
                      ...(selected.matches ?? [])
                        .filter(
                          (x) =>
                            x.bracketSide !== "losers" &&
                            x.bracketSide !== "grand_final",
                        )
                        .map((x) => x.roundNumber),
                    );
                    const isFinal =
                      m.bracketSide === "grand_final" ||
                      (m.bracketSide !== "losers" &&
                        m.roundNumber === winnersMax);
                    return {
                      ...m,
                      isFinal,
                      matchFormat:
                        isFinal && selected.finalsMatchFormat
                          ? selected.finalsMatchFormat
                          : selected.matchFormat,
                    };
                  })}
                  matchFormat={selected.matchFormat}
                  finalsMatchFormat={selected.finalsMatchFormat}
                  onPickWinner={(matchId, slot) =>
                    void setMatchWinner(matchId, slot)
                  }
                  onAssignTeam={(matchId, slot, team) =>
                    void assignBracketTeam(matchId, slot, team)
                  }
                  teamOptions={
                    selected.seeding.length > 0
                      ? selected.seeding.map((s) => ({
                          id: s.teamId,
                          name: s.teamName,
                        }))
                      : teams
                  }
                  savingMatchIds={savingMatchIds}
                  headerSlot={
                    !(selected.matches ?? []).some((m) => m.result != null) ? (
                      <button
                        type="button"
                        disabled={busy}
                        title="Shuffle seed order and rebuild bracket"
                        onClick={() => void reshuffleBracket(selected.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white disabled:opacity-40"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M21 12a9 9 0 1 1-2.6-6.3" />
                          <path d="M21 3v6h-6" />
                        </svg>
                        Shuffle bracket
                      </button>
                    ) : (
                      <p className="text-[10px] text-white/35">
                        Shuffle available only before results are entered. Empty
                        slots: pick a team from the dropdown.
                      </p>
                    )
                  }
                />
              ) : (
                <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                  {selected.matches!.map((m) => {
                    const a = m.participants.find((p) => p.slot === 0);
                    const b = m.participants.find((p) => p.slot === 1);
                    const aName = a?.teamLabel ?? "TBD";
                    const bName = b?.teamLabel ?? "TBD";
                    const done = m.status === "COMPLETED" || m.result != null;
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-white/35">
                          <span>
                            R{m.roundNumber}
                            {m.stageGroupName ? ` · ${m.stageGroupName}` : ""}
                            {m.bracketSide ? ` · ${m.bracketSide}` : ""}
                          </span>
                          <span>{done ? "Completed" : m.status}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={savingMatchIds.has(m.id) || !a?.teamId}
                            onClick={() => void setMatchWinner(m.id, 0)}
                            className={`min-w-[8rem] flex-1 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition disabled:opacity-40 ${
                              m.result?.winnerSlot === 0
                                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                                : "border-white/10 bg-black/30 text-white/80 hover:border-white/25"
                            }`}
                          >
                            {m.result?.winnerSlot === 0 ? "W · " : ""}
                            {aName}
                          </button>
                          <span className="text-[10px] font-bold uppercase text-white/25">
                            vs
                          </span>
                          <button
                            type="button"
                            disabled={savingMatchIds.has(m.id) || !b?.teamId}
                            onClick={() => void setMatchWinner(m.id, 1)}
                            className={`min-w-[8rem] flex-1 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition disabled:opacity-40 ${
                              m.result?.winnerSlot === 1
                                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                                : "border-white/10 bg-black/30 text-white/80 hover:border-white/25"
                            }`}
                          >
                            {m.result?.winnerSlot === 1 ? "W · " : ""}
                            {bName}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
