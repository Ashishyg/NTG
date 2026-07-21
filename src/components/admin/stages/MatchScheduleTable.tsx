"use client";

import { toLocalDatetimeValue } from "./graph-normalize";
import type { StageNode } from "./types";

type Match = NonNullable<StageNode["matches"]>[number];

type Props = {
  matches: Match[];
  savingMatchIds: Set<string>;
  onSetSchedule: (
    matchId: string,
    localValue: string,
    forceConfirm?: boolean,
  ) => void;
};

function StatusBadge({ m }: { m: Match }) {
  const completed =
    m.status.toUpperCase() === "COMPLETE" ||
    m.status.toUpperCase() === "COMPLETED" ||
    m.result != null;
  const pending = m.scheduleStatus === "PENDING_CONFIRM";
  const confirmed = m.scheduleStatus === "CONFIRMED";

  let color = "bg-white/25";
  let label = "Unset";
  if (completed) {
    color = "bg-emerald-400";
    label = "Done";
  } else if (confirmed) {
    color = "bg-cyan-400";
    label = "Set";
  } else if (pending) {
    color = "bg-amber-400";
    label = "Pending";
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/50">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

export default function MatchScheduleTable({
  matches,
  savingMatchIds,
  onSetSchedule,
}: Props) {
  const rows = matches.filter((m) => m.status !== "BYE").slice(0, 60);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-white/35">No matches to schedule yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-black/20">
      <table className="w-full min-w-[36rem] text-left text-xs">
        <thead>
          <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/30">
            <th className="px-3 py-2 font-medium">Match</th>
            <th className="px-3 py-2 font-medium">Kickoff</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const a = m.participants.find((p) => p.slot === 0);
            const b = m.participants.find((p) => p.slot === 1);
            const saving = savingMatchIds.has(m.id);
            return (
              <tr
                key={m.id}
                className="border-b border-white/[0.04] last:border-0"
              >
                <td className="px-3 py-2 text-white/80">
                  {a?.teamLabel ?? "TBD"}{" "}
                  <span className="text-white/25">vs</span>{" "}
                  {b?.teamLabel ?? "TBD"}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="datetime-local"
                    className="rounded-md bg-black/40 px-2 py-1 text-white ring-1 ring-white/10"
                    defaultValue={toLocalDatetimeValue(m.scheduledAt)}
                    disabled={saving}
                    onBlur={(e) => {
                      if (!e.target.value) return;
                      const prev = toLocalDatetimeValue(m.scheduledAt);
                      if (e.target.value === prev) return;
                      void onSetSchedule(m.id, e.target.value, false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const el = e.currentTarget;
                      if (!el.value) return;
                      void onSetSchedule(m.id, el.value, false);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge m={m} />
                  {m.confirmedBySlot0 || m.confirmedBySlot1 ? (
                    <span className="ml-2 text-[10px] text-white/25">
                      {m.confirmedBySlot0 ? "A✓" : "A…"}/
                      {m.confirmedBySlot1 ? "B✓" : "B…"}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={saving}
                    className="cursor-pointer rounded-md bg-cyan-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                    // Prevent input blur→soft-save racing ahead of Force confirm.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      const row = (e.currentTarget as HTMLElement).closest("tr");
                      const input = row?.querySelector(
                        'input[type="datetime-local"]',
                      ) as HTMLInputElement | null;
                      if (!input?.value) return;
                      void onSetSchedule(m.id, input.value, true);
                    }}
                  >
                    Force
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
