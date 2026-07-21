"use client";

import NativeEliminationBracket from "@/components/platform/tournament/NativeEliminationBracket";
import AdminMatchResultsBatch from "./AdminMatchResultsBatch";
import { isElimType } from "./graph-normalize";
import GenerateStageButton from "./GenerateStageButton";
import MatchScheduleTable from "./MatchScheduleTable";
import type { StageNode } from "./types";

type Props = {
  slug: string;
  selected: StageNode;
  teams: { id: string; name: string }[];
  busy: boolean;
  savingMatchIds: Set<string>;
  onGenerate: () => void;
  onSetSchedule: (
    matchId: string,
    localValue: string,
    forceConfirm?: boolean,
  ) => void;
  onSetWinner: (matchId: string, winnerSlot: number) => void;
  onAssignTeam: (
    matchId: string,
    slot: number,
    team: { id: string; name: string } | null,
  ) => void;
  onReshuffleBracket: () => void;
  onResultSaved: () => void;
  onError: (message: string) => void;
};

export default function StageMatchesTab({
  slug,
  selected,
  teams,
  busy,
  savingMatchIds,
  onGenerate,
  onSetSchedule,
  onSetWinner,
  onAssignTeam,
  onReshuffleBracket,
  onResultSaved,
  onError,
}: Props) {
  const matches = selected.matches ?? [];
  const hasMatches = matches.length > 0;
  const elim = isElimType(selected.stageType);
  const playable = matches.filter((m) => m.status !== "BYE");

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl bg-white/[0.025] p-5">
        <GenerateStageButton
          busy={busy}
          runnable={selected.runnable}
          matchCount={selected.matchCount}
          onGenerate={onGenerate}
        />
        <p className="text-[11px] text-white/40">
          Saves drafts for all stages, then builds this stage&apos;s matches from
          pools / seedings.
        </p>
      </div>

      {hasMatches ? (
        <div className="space-y-4 rounded-2xl bg-white/[0.025] p-5">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-white/40">
              Schedules
            </p>
            <p className="mb-3 text-[11px] text-white/40">
              Edit kickoff inline (blur or Enter to save). Force confirms both
              teams without waiting.
            </p>
            <MatchScheduleTable
              matches={matches}
              savingMatchIds={savingMatchIds}
              onSetSchedule={onSetSchedule}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">
              Results &amp; screenshots
            </p>
            <p className="mb-3 text-[11px] text-white/40">
              {elim
                ? "Record each game for BO3 / BO5 (first to 2 / 3). Screenshots per game are optional for admins."
                : "Enter the winner and round scores (for RD / standings). Screenshot is optional."}
            </p>
            <AdminMatchResultsBatch
                slug={slug}
                matches={playable}
                matchFormat={selected.matchFormat}
                finalsMatchFormat={selected.finalsMatchFormat}
                scoreEntryMode={elim ? "series" : "rounds"}
                busy={busy}
                onSaved={onResultSaved}
                onError={onError}
              />
          </div>

          {elim ? (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
                Bracket
              </p>
              <div className="rounded-xl bg-black/20 p-3">
                <NativeEliminationBracket
                  matches={matches.map((m) => {
                    const winnersMax = Math.max(
                      1,
                      ...matches
                        .filter(
                          (x) =>
                            x.bracketSide !== "losers" &&
                            x.bracketSide !== "grand_final",
                        )
                        .map((x) => x.roundNumber),
                    );
                    const isFinal =
                      m.bracketSide === "grand_final" ||
                      (m.bracketSide !== "losers" &&
                        m.roundNumber === winnersMax);
                    return {
                      ...m,
                      isFinal,
                      scheduledAt: m.scheduledAt,
                      scheduleStatus: m.scheduleStatus,
                    };
                  })}
                  matchFormat={selected.matchFormat}
                  finalsMatchFormat={selected.finalsMatchFormat}
                  onPickWinner={onSetWinner}
                  onAssignTeam={onAssignTeam}
                  teamOptions={teams}
                  savingMatchIds={savingMatchIds}
                  headerSlot={
                    !matches.some((m) => m.result) ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={onReshuffleBracket}
                        className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 disabled:opacity-40"
                      >
                        Reshuffle bracket
                      </button>
                    ) : null
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-2xl bg-white/[0.02] px-5 py-8 text-center text-sm text-white/35">
          No matches yet — generate to build the bracket or round robin.
        </p>
      )}
    </div>
  );
}
