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
  if (kind === "ELIMINATED") return "Eliminated";
  if (kind === "CHAMPION") return "Champion";
  if (kind === "LOWER_BRACKET") return "Lower Bracket";
  return label.replace(/^(Advance to|Advances to|Direct to)\s+/i, "");
}

/** Parse human-readable selectors like "Top 2", "Bottom 1", "2nd & 3rd" into position arrays. */
function parsePositionsFromSelector(selector: string, totalTeams: number): number[] {
  const s = selector.toLowerCase().trim();
  const top = s.match(/^top\s+(\d+)$/);
  if (top) {
    const n = parseInt(top[1]);
    return Array.from({ length: n }, (_, i) => i + 1);
  }
  const bottom = s.match(/^bottom\s+(\d+)$/);
  if (bottom) {
    const n = parseInt(bottom[1]);
    return Array.from({ length: n }, (_, i) => totalTeams - n + i + 1);
  }
  // "2nd & 3rd & 4th" or "1st, 2nd" etc. — grab all numbers
  const nums = [...s.matchAll(/(\d+)/g)].map((m) => parseInt(m[1]));
  if (nums.length > 0) return nums;
  return [];
}

type PositionStatus = "qualify" | "eliminated" | "neutral";

function getPositionStatus(
  pos: number,
  totalTeams: number,
  groupId: string,
  rules: TournamentStagePublicView["qualificationRules"],
): PositionStatus {
  const applicable = rules.filter(
    (r) => r.groupId === null || r.groupId === groupId,
  );
  for (const rule of applicable) {
    const positions = parsePositionsFromSelector(rule.selectorLabel, totalTeams);
    if (positions.includes(pos)) {
      return rule.destinationKind === "ELIMINATED" ? "eliminated" : "qualify";
    }
  }
  return "neutral";
}

export default function TournamentStageBrackets({ stages, accentHex = "#22d3ee" }: Props) {
  const [activeId, setActiveId] = useState(stages[0]?.id ?? "");
  const active = stages.find((s) => s.id === activeId) ?? stages[0];

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const isLastStage  = active?.id === sortedStages[sortedStages.length - 1]?.id;

  if (!active) return null;

  return (
    <div className="space-y-8">
      {/* ── Stage tab pills ── */}
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => {
          const on = s.id === active.id;
          const locked = s.revealed === false;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={`relative rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
                on ? "text-white" : locked ? "text-white/25 hover:text-white/45" : "text-white/40 hover:text-white/70"
              }`}
              style={
                on
                  ? { background: `${accentHex}18`, boxShadow: `0 0 0 1px ${accentHex}40, 0 0 20px -8px ${accentHex}` }
                  : { background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.07)" }
              }
            >
              {s.name}
              {locked ? (
                <span className="ml-1.5 text-[9px] font-medium normal-case tracking-wide text-white/30">
                  TBD
                </span>
              ) : null}
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

        {active.revealed === false ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
            <p className="font-display text-lg font-bold uppercase tracking-widest text-white/55">
              To be decided
            </p>
            <p className="mt-2 text-sm text-white/35">
              Teams and matches for this stage unlock after the previous stage is fully complete.
            </p>
          </div>
        ) : (
          <>
        {/* ── Qualification Rules ── */}
        {!isLastStage && (active.qualificationRules?.length ?? 0) > 0 && (() => {
          const deduped = [
            ...new Map(
              active.qualificationRules.map((r) => [
                `${r.selectorLabel}|${r.destinationKind}|${r.destinationLabel}`,
                r,
              ]),
            ).values(),
          ];
          // Qualify rules first, eliminated rules last
          const sorted = [
            ...deduped.filter((r) => r.destinationKind !== "ELIMINATED"),
            ...deduped.filter((r) => r.destinationKind === "ELIMINATED"),
          ];
          return (
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/28">
                Qualification Criteria
              </p>
              <div className="flex flex-col gap-2.5">
                {sorted.map((rule) => {
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
                            : "bg-rose-500/10 text-rose-400/75 ring-1 ring-rose-500/20"
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
                        <th
                          className="pb-3 text-right font-medium w-10"
                          title="Rounds won"
                        >
                          RW
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.standings.map((row, i) => {
                          const total = g.standings.length;
                          const status = getPositionStatus(
                            row.position || i + 1,
                            total,
                            g.id,
                            active.qualificationRules ?? [],
                          );
                          const borderColor =
                            status === "qualify"
                              ? "rgba(52,211,153,0.55)"
                              : status === "eliminated"
                                ? "rgba(251,113,133,0.50)"
                                : "transparent";
                          return (
                          <tr
                            key={row.teamId}
                            className="border-b border-white/[0.03] last:border-0"
                          >
                            <td
                              className="py-3 pl-1 pr-2 tabular-nums text-xs text-white/35"
                              style={{ boxShadow: `inset 3px 0 0 ${borderColor}` }}
                            >
                              {i + 1}
                            </td>
                            <td
                              className={`py-3 font-semibold text-[13px] ${
                                status === "qualify"
                                  ? "text-white/90"
                                  : status === "eliminated"
                                    ? "text-white/35"
                                    : "text-white/75"
                              }`}
                            >
                              {row.teamName}
                            </td>
                            <td className="py-3 text-right tabular-nums text-white/45 text-xs">{row.wins}</td>
                            <td className="py-3 text-right tabular-nums text-white/45 text-xs">{row.losses}</td>
                            <td className="py-3 text-right tabular-nums text-white/45 text-xs">
                              {row.roundDiff > 0
                                ? `+${row.roundDiff}`
                                : row.roundDiff < 0
                                  ? `${row.roundDiff}`
                                  : "0"}
                            </td>
                            <td className="py-3 text-right tabular-nums font-bold text-white/85 text-xs">
                              {row.roundsFor ?? 0}
                            </td>
                          </tr>
                          );
                        })}
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
                        {m.bracketSide ? (
                          <span className="text-[10px] uppercase tracking-widest text-white/25 font-medium">
                            {m.bracketSide}
                          </span>
                        ) : <span />}
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
                        {/* Score or vs */}
                        {completed && m.result ? (() => {
                          const gamesWithScores = m.result.games?.filter(
                            (gm) => gm.scoreA != null && gm.scoreB != null,
                          );
                          let scoreText = "";
                          if (gamesWithScores && gamesWithScores.length > 0) {
                            if (m.matchFormat === "BO1" || gamesWithScores.length === 1) {
                              scoreText = `${gamesWithScores[0]!.scoreA}–${gamesWithScores[0]!.scoreB}`;
                            } else {
                              const details = gamesWithScores
                                .map((gm) => `${gm.scoreA}–${gm.scoreB}`)
                                .join(", ");
                              scoreText = `${m.result.scoreA ?? 0}–${m.result.scoreB ?? 0} (${details})`;
                            }
                          } else {
                            scoreText = `${m.result.scoreA ?? "?"}–${m.result.scoreB ?? "?"}`;
                          }
                          return (
                            <span className="shrink-0 tabular-nums text-[11px] font-bold text-white/55">
                              {scoreText}
                            </span>
                          );
                        })() : (
                          <span className="shrink-0 text-[10px] text-white/20 font-medium">vs</span>
                        )}
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
          </>
        )}
      </div>
    </div>
  );
}
