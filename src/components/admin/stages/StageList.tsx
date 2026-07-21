"use client";

import type { StageNode } from "./types";

type Props = {
  stages: StageNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function StageList({ stages, selectedId, onSelect }: Props) {
  if (stages.length === 0) {
    return (
      <p className="text-sm text-white/40">No stages yet — add one below.</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stages.map((s, idx) => (
        <div key={s.id} className="flex items-center gap-2">
          {idx > 0 ? <span className="text-white/25">↓</span> : null}
          <button
            type="button"
            onClick={() => onSelect(s.id)}
            className={`rounded-xl px-4 py-3 text-left transition ${
              selectedId === s.id
                ? "bg-cyan-500/15 ring-1 ring-cyan-500/40"
                : "bg-white/[0.03] hover:bg-white/[0.06]"
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
    </div>
  );
}
