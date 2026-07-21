"use client";

import { useState, useEffect } from "react";
import type { StageNode } from "./types";

type Props = {
  rule: StageNode["rules"][number];
  groups: StageNode["groups"];
  laterStages: StageNode[];
  maxPos: number;
  onChange: (next: StageNode["rules"][number]) => void;
  onRemove: () => void;
};

function RuleNumberInput({
  value,
  fallback,
  onCommit,
}: {
  value: number | undefined;
  fallback: number;
  onCommit: (n: number) => void;
}) {
  const [strVal, setStrVal] = useState(value != null && !isNaN(value) ? String(value) : String(fallback));

  useEffect(() => {
    if (value != null && !isNaN(value)) {
      setStrVal(String(value));
    }
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      onCommit(parsed);
    } else {
      setStrVal(String(fallback));
      onCommit(fallback);
    }
  };

  return (
    <input
      type="number"
      min={1}
      className="w-16 rounded-md bg-black/35 px-2.5 py-1.5 text-xs text-white ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-cyan-500/50"
      value={strVal}
      onChange={(e) => {
        const raw = e.target.value;
        setStrVal(raw);
        if (raw !== "") {
          const parsed = parseInt(raw, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            onCommit(parsed);
          }
        }
      }}
      onBlur={() => commit(strVal)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit(strVal);
        }
      }}
    />
  );
}

export default function QualificationRuleRow({
  rule,
  groups,
  laterStages,
  maxPos,
  onChange,
  onRemove,
}: Props) {
  const kind =
    rule.selector.kind === "BOTTOM_N"
      ? "BOTTOM_N"
      : rule.selector.kind === "POSITION"
        ? "POSITION"
        : "TOP_N";

  const resolvedStageId =
    rule.destination.kind === "STAGE" || rule.destination.kind === "STAGE_GROUP"
      ? laterStages.find((s) => s.id === rule.destination.stageId)?.id
      : undefined;

  const destValue = resolvedStageId
    ? `s:${resolvedStageId}`
    : rule.destination.kind === "CHAMPION"
      ? "CHAMPION"
      : rule.destination.kind === "ELIMINATED"
        ? "ELIMINATED"
        : "";

  const selectClass =
    "rounded-md bg-black/35 px-2 py-1.5 text-xs text-white ring-1 ring-white/10";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-white/[0.04] py-3 text-xs text-white/70 last:border-0">
      <span className="text-white/40">Send</span>
      <select
        className={selectClass}
        value={kind}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "POSITION") {
            onChange({
              ...rule,
              selector: {
                kind: "POSITION",
                positions: rule.selector.positions?.length
                  ? rule.selector.positions
                  : [3],
              },
            });
          } else if (next === "BOTTOM_N") {
            onChange({
              ...rule,
              selector: { kind: "BOTTOM_N", n: rule.selector.n ?? 1 },
            });
          } else {
            onChange({
              ...rule,
              selector: { kind: "TOP_N", n: rule.selector.n ?? 2 },
            });
          }
        }}
      >
        <option value="TOP_N">Top</option>
        <option value="BOTTOM_N">Bottom</option>
        <option value="POSITION">Place</option>
      </select>

      {kind === "POSITION" ? (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: maxPos }, (_, i) => i + 1).map((p) => {
            const on = (rule.selector.positions ?? []).includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  const cur = new Set(rule.selector.positions ?? []);
                  if (cur.has(p)) cur.delete(p);
                  else cur.add(p);
                  onChange({
                    ...rule,
                    selector: {
                      kind: "POSITION",
                      positions: [...cur].sort((a, b) => a - b),
                    },
                  });
                }}
                className={`h-7 min-w-7 rounded-md px-1.5 text-[11px] font-semibold ${
                  on
                    ? "bg-cyan-500/25 text-cyan-100"
                    : "bg-white/[0.04] text-white/40"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      ) : (
        <RuleNumberInput
          value={rule.selector.n}
          fallback={kind === "BOTTOM_N" ? 1 : 2}
          onCommit={(n) => onChange({ ...rule, selector: { kind, n } })}
        />
      )}

      <span className="text-white/40">from</span>
      <select
        className={selectClass}
        value={rule.groupId ?? ""}
        onChange={(e) =>
          onChange({ ...rule, groupId: e.target.value || null })
        }
      >
        <option value="">All groups</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <span className="text-white/40">to</span>
      <select
        className={selectClass}
        value={destValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v.startsWith("s:")) {
            onChange({
              ...rule,
              destination: { kind: "STAGE", stageId: v.slice(2) },
            });
          } else {
            onChange({
              ...rule,
              destination: { kind: v },
            });
          }
        }}
      >
        {laterStages.map((s) => (
          <option key={s.id} value={`s:${s.id}`}>
            {s.name}
          </option>
        ))}
        {!resolvedStageId &&
        (rule.destination.kind === "STAGE" ||
          rule.destination.kind === "STAGE_GROUP") ? (
          <option value="" disabled>
            Pick a stage
          </option>
        ) : null}
        <option value="CHAMPION">Champion</option>
        <option value="ELIMINATED">Eliminated</option>
      </select>

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300/80 hover:bg-rose-500/15 hover:text-rose-200"
      >
        Remove
      </button>
    </div>
  );
}
