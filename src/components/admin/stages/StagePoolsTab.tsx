"use client";

import PoolBoard from "./PoolBoard";
import type { StageNode } from "./types";

type Props = {
  selected: StageNode;
  unassigned: { id: string; name: string }[];
  dragTeamId: string | null;
  setDragTeamId: (id: string | null) => void;
  busy: boolean;
  dirty?: boolean;
  onSetGroupCount: (stage: StageNode, n: number) => void;
  onReshuffle: (stage: StageNode) => void;
  onMoveTeam: (teamId: string, target: string | "UNASSIGNED") => void;
  onPatch: (mutator: (s: StageNode) => StageNode) => void;
  onSave: () => void;
};

export default function StagePoolsTab(props: Props) {
  const { selected, busy, dirty = false, onSave } = props;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/[0.025] p-5">
        <p className="mb-4 text-xs text-white/45">
          Assign teams into pools, then save. Generate builds matches from the
          saved roster.
        </p>
        <PoolBoard
          selected={selected}
          unassigned={props.unassigned}
          dragTeamId={props.dragTeamId}
          setDragTeamId={props.setDragTeamId}
          busy={busy}
          onSetGroupCount={(n) => props.onSetGroupCount(selected, n)}
          onReshuffle={() => props.onReshuffle(selected)}
          onMoveTeam={props.onMoveTeam}
          onPatch={props.onPatch}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.025] px-5 py-4">
        <p className="text-[11px] text-white/40">
          {dirty
            ? "Unsaved pool changes — save to apply them."
            : "Teams & pools are saved for this stage."}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save pools"}
        </button>
      </div>
    </div>
  );
}
