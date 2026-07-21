"use client";

import { useState, useEffect } from "react";
import type { StageNode } from "./types";

type Props = {
  selected: StageNode;
  unassigned: { id: string; name: string }[];
  dragTeamId: string | null;
  setDragTeamId: (id: string | null) => void;
  busy: boolean;
  onSetGroupCount: (n: number) => void;
  onReshuffle: () => void;
  onMoveTeam: (teamId: string, target: string | "UNASSIGNED") => void;
  onPatch: (mutator: (s: StageNode) => StageNode) => void;
};

function PoolCountInput({
  groupCount,
  onSetGroupCount,
}: {
  groupCount: number;
  onSetGroupCount: (n: number) => void;
}) {
  const [val, setVal] = useState(String(groupCount));

  useEffect(() => {
    setVal(String(groupCount));
  }, [groupCount]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 16) {
      if (parsed !== groupCount) {
        onSetGroupCount(parsed);
      }
    } else {
      setVal(String(groupCount));
    }
  };

  return (
    <input
      type="number"
      min={1}
      max={16}
      className="mt-1 w-24 rounded-lg bg-black/30 px-3 py-2 text-sm text-white ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-cyan-500/50"
      value={val}
      onChange={(e) => {
        const raw = e.target.value;
        setVal(raw);
        if (raw !== "") {
          const parsed = parseInt(raw, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 16) {
            onSetGroupCount(parsed);
          }
        }
      }}
      onBlur={() => commit(val)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit(val);
        }
      }}
    />
  );
}

export default function PoolBoard({
  selected,
  unassigned,
  dragTeamId,
  setDragTeamId,
  busy,
  onSetGroupCount,
  onReshuffle,
  onMoveTeam,
  onPatch,
}: Props) {
  const isManual = selected.seedingMethod !== "RANDOM";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-white/50">
          Number of pools
          <PoolCountInput
            groupCount={Math.max(1, selected.groups.length)}
            onSetGroupCount={onSetGroupCount}
          />
        </label>
        <label className="text-xs text-white/50">
          Assignment
          <select
            className="mt-1 rounded-lg bg-black/30 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            value={isManual ? "MANUAL" : "RANDOM"}
            onChange={(e) => {
              if (e.target.value === "RANDOM") {
                onReshuffle();
              } else {
                onPatch((s) => ({ ...s, seedingMethod: "MANUAL" }));
              }
            }}
          >
            <option value="MANUAL">Manual (drag & drop)</option>
            <option value="RANDOM">Randomizer</option>
          </select>
        </label>
        {!isManual ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReshuffle}
            className="rounded-lg bg-white/[0.06] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/[0.1] disabled:opacity-40"
          >
            Shuffle again
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isManual ? (
          <div
            className="rounded-xl bg-white/[0.02] p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/team-id") || dragTeamId;
              if (id) onMoveTeam(id, "UNASSIGNED");
              setDragTeamId(null);
            }}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Unassigned ({unassigned.length})
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {unassigned.map((t) => (
                <li
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    setDragTeamId(t.id);
                    e.dataTransfer.setData("text/team-id", t.id);
                  }}
                  className="cursor-grab rounded-lg bg-black/25 px-2.5 py-1.5 text-xs text-white/80 active:cursor-grabbing"
                >
                  {t.name}
                </li>
              ))}
              {unassigned.length === 0 ? (
                <li className="text-xs text-white/30">All teams placed</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {selected.groups.map((g) => (
          <div
            key={g.id}
            className="rounded-xl bg-white/[0.035] p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/team-id") || dragTeamId;
              if (id) onMoveTeam(id, g.id);
              setDragTeamId(null);
            }}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {g.name}{" "}
              <span className="text-white/25">
                · {g.slots.filter((s) => s.teamId).length}
              </span>
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {g.slots
                .filter((s) => s.teamId)
                .map((s) => (
                  <li
                    key={s.id}
                    draggable={isManual}
                    onDragStart={(e) => {
                      if (!s.teamId) return;
                      setDragTeamId(s.teamId);
                      e.dataTransfer.setData("text/team-id", s.teamId);
                    }}
                    className={`rounded-lg bg-black/25 px-2.5 py-1.5 text-xs text-white/80 ${
                      isManual ? "cursor-grab active:cursor-grabbing" : ""
                    }`}
                  >
                    {s.teamName ?? "Team"}
                  </li>
                ))}
              {!isManual && g.slots.every((s) => !s.teamId) ? (
                <li className="text-xs text-white/30">Filled on Generate</li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
