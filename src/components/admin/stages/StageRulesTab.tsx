"use client";

import QualificationRuleRow from "./QualificationRuleRow";
import type { StageNode } from "./types";

type Props = {
  selected: StageNode;
  laterStages: StageNode[];
  busy: boolean;
  dirty?: boolean;
  onAddRule: (stage: StageNode) => void;
  onUpdateRule: (ri: number, next: StageNode["rules"][number]) => void;
  onRemoveRule: (ri: number) => void;
  onSave: () => void;
};

export default function StageRulesTab({
  selected,
  laterStages,
  busy,
  dirty = false,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onSave,
}: Props) {
  const maxPos = Math.max(
    8,
    ...selected.groups.map((g) => g.slots.length || g.targetSize || 0),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/[0.025] p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">
              Qualification rules
            </p>
            <p className="mt-0.5 text-[11px] text-white/45">
              {laterStages.length > 0
                ? "Send Top / Bottom / Place finishers to a later stage."
                : "Final stage — use Champion or Eliminated."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAddRule(selected)}
            className="rounded-md bg-cyan-600/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-600/35 disabled:opacity-40"
          >
            + Add rule
          </button>
        </div>

        {laterStages.length === 0 ? (
          <p className="mb-3 rounded-lg bg-amber-500/5 px-3 py-2 text-xs text-amber-100/80">
            This is the last stage — add another stage if you need a further
            round.
          </p>
        ) : null}

        {selected.rules.length === 0 ? (
          <p className="text-sm text-white/35">No rules yet.</p>
        ) : (
          <div>
            {selected.rules.map((rule, ri) => (
              <QualificationRuleRow
                key={rule.id}
                rule={rule}
                groups={selected.groups}
                laterStages={laterStages}
                maxPos={maxPos}
                onChange={(next) => onUpdateRule(ri, next)}
                onRemove={() => onRemoveRule(ri)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.025] px-5 py-4">
        <p className="text-[11px] text-white/40">
          {dirty
            ? "Unsaved rule changes — save to apply them."
            : "Rules are saved for this stage."}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save rules"}
        </button>
      </div>
    </div>
  );
}
