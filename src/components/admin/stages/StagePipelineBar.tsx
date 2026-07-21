"use client";

import type { StageNode } from "./types";

type Props = {
  stages: StageNode[];
};

export default function StagePipelineBar({ stages }: Props) {
  if (stages.length <= 1) return null;

  return (
    <div className="rounded-xl bg-white/[0.03] px-4 py-3">
      <p className="text-xs text-white/50">
        Pipeline:{" "}
        {stages.map((s, i) => (
          <span key={s.id}>
            {i > 0 ? <span className="text-white/25"> → </span> : null}
            <span className="text-white/70">{s.name}</span>
          </span>
        ))}
      </p>
    </div>
  );
}
