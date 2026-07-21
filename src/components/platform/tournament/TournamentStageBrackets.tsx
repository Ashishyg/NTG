"use client";

import { useState } from "react";
import type { TournamentStagePublicView } from "@core/contracts/tournament-stages";
import NativeEliminationBracket from "./NativeEliminationBracket";

type Props = {
  stages: TournamentStagePublicView[];
  accentHex?: string;
};

const TYPE_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elimination",
  DOUBLE_ELIMINATION: "Double Elimination",
  ROUND_ROBIN: "Round Robin",
  SWISS: "Swiss",
  GSL: "GSL",
  LEAGUE: "League",
  FREE_FOR_ALL: "Free For All",
  BATTLE_ROYALE: "Battle Royale",
  CUSTOM: "Custom",
};

function isElim(type: string) {
  return type === "SINGLE_ELIMINATION" || type === "DOUBLE_ELIMINATION";
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "LIVE" || s === "IN_PROGRESS")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/25">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        Live
      </span>
    );
  if (s === "COMPLETE" || s === "COMPLETED")
    return (
      <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40 ring-1 ring-white/10">
        Complete
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/30 ring-1 ring-white/[0.08]">
      {status}
    </span>
  );
}

function destText(kind: string, label: string): string {
  if (kind === "ELIMINATED") return "Tournament Exit";
  if (kind === "CHAMPION")   return `Direct to ${label}`;
  return `Advance to ${label}`;
}

export default function TournamentStageBrackets({ stages, accentHex = "#22d3ee" }: Props) {
  const [activeId, setActiveId] = useState(stages[0]?.id ?? "");
  const active = stages.find((s) => s.id === activeId) ?? stages[0];

  if (!active) return null;

  return (
    <div className="space-y-8">
      {/* ── Stage tab pills ── */}
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => {
          const on = s.id === active.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={`relative rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
                on ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
              style={
                on
                  ? { background: `${accentHex}18`, boxShadow: `0 0 0 1px ${accentHex}40, 0 0 20px -8px ${accentHex}` }
                  : { background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.07)" }
              }
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* ── Stage card ── */}
      <div
        className="rounded-2xl border border-white/[0.09] p-6 sm:p-8"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(7,11,20,0.72) 40%, rgba(34,211,238,0.06) 100%)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 60px -20px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <h3 className="font-display text-lg font-bold text-white tracking-tight">
            {active.name}
          </h3>
          <span className="text-white/20">·</span>
          <span className="text-[11px] font-medium text-white/40 tracking-wider uppercase">
            {TYPE_LABEL[active.stageType] ?? active.stageType}
          </span>
          <span className="text-white/20">·</span>
          <span className="text-[11px] font-medium text-white/40 tracking-wider uppercase">
            {active.matchFormat}
            {active.finalsMatchFormat && isElim(active.stageType)
              ? ` · Final ${active.finalsMatchFormat}`
              : ""}
          </span>
          <StatusPill status={active.status} />
        </div>

        {/* ── Qualification Rules ── */}
        {(active.qualificationRules?.length ?? 0) > 0 && (() => {
          const deduped = [
            ...new Map(
              active.qualificationRules.map((r) => [
                `${r.selectorLabel}|${r.destinationKind}|${r.destinationLabel}`,
                r,
              ]),
            ).values(),
          ];
          return (
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/28">
                Qualification
              </p>
              <div className="flex flex-col gap-2.5">
                {deduped.map((rule) => {
                  const advances  = rule.destinationKind !== "ELIMINATED";
                  const eliminated = rule.destinationKind === "ELIMINATED";
                  return (
                    <div
                      key={`${rule.selectorLabel}-${rule.destinationLabel}`}
                      className="flex items-center gap-3"
                    >
                      {/* Badge */}
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          advances
                            ? "bg-emerald-500/10 text-emerald-400/75 ring-1 ring-emerald-500/20"
                            : "bg-white/[0.04] text-white/28 ring-1 ring-white/[0.08]"
                        }`}
                      >
                        {eliminated ? "Eliminated" : "Qualify"}
                      </span>
                      {/* Position selector */}
                      <span className="text-[13px] font-medium text-white/65">
                        {rule.selectorLabel}
                      </span>
                      {/* Arrow */}
                      <span className="text-white/22 text-sm">→</span>
                      {/* Destination */}
                      <span className={`text-[13px] ${advances ? "text-white/42" : "text-white/25"}`}>
                        {destText(rule.destinationKind, rule.destinationLabel)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Pools / standings (non-elim) ── */}
        {active.groups.length > 0 && !isElim(active.stageType) ? (
          <div className="mb-10 grid gap-4 md:grid-cols-2">
            {active.groups.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5"
              >
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  {g.name}
                </p>
                {g.standings.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-white/25 border-b border-white/[0.06]">
                        <th className="pb-3 font-medium w-6">#</th>
                        <th className="pb-3 font-medium">Team</th>
                        <th className="pb-3 text-right font-medium w-8">W</th>
                        <th className="pb-3 text-right font-medium w-8">L</th>
                        <th className="pb-3 text-right font-medium w-10">RD</th>
                        <th className="pb-3 text-right font-medium w-10">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.standings.map((row, i) => (
                        <tr
                          key={row.teamId}
                          className="border-b border-white/[0.04] last:border-0"
                        >
                          <td className="py-2.5 text-white/30 tabular-nums text-xs">{i + 1}</td>
                          <td className="py-2.5 font-medium text-white/80 text-[13px]">{row.teamName}</td>
                          <td className="py-2.5 text-right tabular-nums text-white/50 text-xs">{row.wins}</td>
                          <td className="py-2.5 text-right tabular-nums text-white/50 text-xs">{row.losses}</td>
                          <td className="py-2.5 text-right tabular-nums text-white/50 text-xs">
                            {row.roundDiff > 0 ? `+${row.roundDiff}` : row.roundDiff}
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-bold text-white/90 text-xs">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <ul className="space-y-1.5 text-sm text-white/50">
                    {g.slots.map((slot) => (
                      <li key={slot.id} className="flex gap-2">
                        <span className="text-white/25 tabular-nums">{slot.slotIndex + 1}.</span>
                        {slot.teamName ??
                          (slot.sourcePosition
                            ? `TBD (pos ${slot.sourcePosition})`
                            : "—")}
                      </li>
                    ))}
                    {g.slots.length === 0 ? (
                      <li className="text-white/30">No teams assigned yet.</li>
                    ) : null}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Matches ── */}
        {active.matches.length > 0 ? (
          isElim(active.stageType) ? (
            <NativeEliminationBracket
              matches={active.matches}
              matchFormat={active.matchFormat}
              finalsMatchFormat={active.finalsMatchFormat}
              accentHex={accentHex}
            />
          ) : (
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">
                Matches
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {active.matches.map((m) => {
                  const a = m.participants.find((p) => p.slot === 0);
                  const b = m.participants.find((p) => p.slot === 1);
                  const completed =
                    m.status.toUpperCase() === "COMPLETE" ||
                    m.status.toUpperCase() === "COMPLETED";
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-white/25 font-medium">
                          R{m.roundNumber}
                          {m.bracketSide ? ` · ${m.bracketSide}` : ""}
                        </span>
                        {completed && (
                          <span className="text-[10px] uppercase tracking-widest text-white/25 font-medium">
                            Done
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex-1 truncate text-[13px] font-semibold ${
                            m.result?.winnerSlot === 0
                              ? "text-emerald-400"
                              : m.result != null
                                ? "text-white/30"
                                : "text-white/70"
                          }`}
                        >
                          {a?.teamLabel ?? "TBD"}
                        </span>
                        <span className="shrink-0 text-[10px] text-white/20 font-medium">vs</span>
                        <span
                          className={`flex-1 truncate text-right text-[13px] font-semibold ${
                            m.result?.winnerSlot === 1
                              ? "text-emerald-400"
                              : m.result != null
                                ? "text-white/30"
                                : "text-white/70"
                          }`}
                        >
                          {b?.teamLabel ?? "TBD"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          <p className="text-sm text-white/30">Matches have not been generated yet.</p>
        )}
      </div>
    </div>
  );
}
