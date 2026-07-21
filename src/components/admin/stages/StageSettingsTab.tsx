"use client";

import type { StageType } from "@prisma/client";
import { isElimType, toLocalDatetimeValue } from "./graph-normalize";
import { STAGE_TYPES, type SeedSource, type StageNode } from "./types";

type Props = {
  selected: StageNode;
  busy: boolean;
  dirty?: boolean;
  previousStage: StageNode | null;
  earlierStages: StageNode[];
  onPatch: (mutator: (s: StageNode) => StageNode) => void;
  onDelete: () => void;
  onSave: () => void;
};

const inputClass =
  "mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-cyan-500/40";

export default function StageSettingsTab({
  selected,
  busy,
  dirty = false,
  previousStage,
  earlierStages,
  onPatch,
  onDelete,
  onSave,
}: Props) {
  const selectedFeederIds =
    selected.feederStageIds.length > 0
      ? selected.feederStageIds
      : previousStage
        ? [previousStage.id]
        : [];

  function toggleFeeder(stageId: string) {
    onPatch((s) => {
      const current =
        s.feederStageIds.length > 0
          ? s.feederStageIds
          : previousStage
            ? [previousStage.id]
            : [];
      const next = current.includes(stageId)
        ? current.filter((id) => id !== stageId)
        : [...current, stageId];
      return { ...s, feederStageIds: next, seedSource: "PREVIOUS_STAGE" };
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-5 rounded-2xl bg-white/[0.025] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[16rem] flex-1 space-y-3">
            <label className="block text-xs text-white/50">
              Stage name
              <input
                className={inputClass}
                value={selected.name}
                onChange={(e) =>
                  onPatch((s) => ({ ...s, name: e.target.value }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs text-white/50">
                Format
                <select
                  className={inputClass}
                  value={selected.stageType}
                  onChange={(e) => {
                    const stageType = e.target.value as StageType;
                    onPatch((s) => ({
                      ...s,
                      stageType,
                      seedSource: s.order > 1 ? "PREVIOUS_STAGE" : s.seedSource,
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
                Match format
                <select
                  className={inputClass}
                  value={selected.matchFormat}
                  onChange={(e) =>
                    onPatch((s) => ({
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
                    className={inputClass}
                    value={selected.finalsMatchFormat ?? "BO5"}
                    onChange={(e) =>
                      onPatch((s) => ({
                        ...s,
                        finalsMatchFormat: e.target.value as
                          | "BO1"
                          | "BO3"
                          | "BO5",
                      }))
                    }
                  >
                    <option value="BO1">BO1</option>
                    <option value="BO3">BO3</option>
                    <option value="BO5">BO5</option>
                  </select>
                </label>
              ) : null}
              <label className="block text-xs text-white/50">
                Seed source
                <select
                  className={inputClass}
                  value={selected.seedSource}
                  onChange={(e) => {
                    const seedSource = e.target.value as SeedSource;
                    onPatch((s) => ({
                      ...s,
                      seedSource,
                      feederStageIds:
                        seedSource === "PREVIOUS_STAGE" &&
                        s.feederStageIds.length === 0 &&
                        previousStage
                          ? [previousStage.id]
                          : seedSource === "TEAMS"
                            ? []
                            : s.feederStageIds,
                    }));
                  }}
                >
                  <option value="TEAMS">Cup teams</option>
                  <option
                    value="PREVIOUS_STAGE"
                    disabled={selected.order <= 1}
                  >
                    Earlier stages
                  </option>
                </select>
              </label>
              <label className="block text-xs text-white/50">
                Finishes by
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={toLocalDatetimeValue(selected.finishesAt)}
                  onChange={(e) =>
                    onPatch((s) => ({
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
                  className={inputClass}
                  value={selected.resultWindowHours ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      onPatch((s) => ({
                        ...s,
                        resultWindowHours: undefined as unknown as number,
                      }));
                    } else {
                      const parsed = parseInt(raw, 10);
                      if (!isNaN(parsed)) {
                        onPatch((s) => ({
                          ...s,
                          resultWindowHours: Math.max(1, parsed),
                        }));
                      }
                    }
                  }}
                  onBlur={() => {
                    if (
                      typeof selected.resultWindowHours !== "number" ||
                      isNaN(selected.resultWindowHours) ||
                      selected.resultWindowHours < 1
                    ) {
                      onPatch((s) => ({ ...s, resultWindowHours: 3 }));
                    }
                  }}
                />
                <p className="mt-1 text-[11px] text-white/35">
                  Teams submit result + screenshot within this many hours after
                  kickoff.
                </p>
              </label>
            </div>

            {selected.seedSource === "PREVIOUS_STAGE" &&
            earlierStages.length > 0 ? (
              <div className="rounded-xl bg-white/[0.03] px-3 py-3 ring-1 ring-white/10">
                <p className="text-xs font-bold uppercase tracking-wider text-white/45">
                  Take teams from
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  Pick one or more earlier stages. On each selected stage, set
                  Rules to send teams here (e.g. Stage 1 Top → this stage).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {earlierStages.map((s) => {
                    const checked = selectedFeederIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs ring-1 transition ${
                          checked
                            ? "bg-cyan-500/15 text-cyan-100 ring-cyan-500/35"
                            : "bg-black/20 text-white/55 ring-white/10 hover:text-white/80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-cyan-500"
                          checked={checked}
                          disabled={busy}
                          onChange={() => toggleFeeder(s.id)}
                        />
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-white/35">#{s.order}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="text-xs font-bold uppercase tracking-wider text-rose-400/80 hover:text-rose-300 disabled:opacity-40"
          >
            Delete stage
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.025] px-5 py-4">
        <p className="text-[11px] text-white/40">
          {dirty
            ? "Unsaved settings — save to apply them."
            : "Settings are saved for this stage."}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
