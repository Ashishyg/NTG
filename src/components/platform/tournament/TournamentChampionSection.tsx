"use client";

import type { GameSlug } from "@prisma/client";
import type {
  TournamentTeamView,
  TournamentTeamPlayerView,
  TournamentBracketView,
} from "@core/contracts";
import type { TournamentStagePublicView } from "@core/contracts/tournament-stages";

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  CAPTAIN: { label: "Captain", color: "#f6c177" },
  CO_CAPTAIN: { label: "Co-Captain", color: "#a78bfa" },
  PLAYER: { label: "Player", color: "#5eead4" },
};

const ROLE_ORDER: Record<string, number> = { CAPTAIN: 0, CO_CAPTAIN: 1, PLAYER: 2 };

function sortByRole(players: TournamentTeamPlayerView[]): TournamentTeamPlayerView[] {
  return [...players].sort(
    (a, b) =>
      (ROLE_ORDER[a.participantRole ?? "PLAYER"] ?? 2) -
      (ROLE_ORDER[b.participantRole ?? "PLAYER"] ?? 2),
  );
}

export type ChampionResult = {
  championTeam: TournamentTeamView;
  runnerUpTeam?: TournamentTeamView | null;
  matchScore?: string | null;
  stageName?: string | null;
};

export function resolveChampion(
  stages: TournamentStagePublicView[] = [],
  bracket: TournamentBracketView | null = null,
  teamDetails: TournamentTeamView[] = [],
  teams: string[] = [],
): ChampionResult | null {
  // 1. Native Stages resolution
  if (stages.length > 0) {
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const lastStage = sorted[sorted.length - 1];
    if (lastStage && lastStage.matches.length > 0) {
      let finalMatch = lastStage.matches.find(
        (m) => m.isFinal || m.bracketSide === "grand_final",
      );
      if (!finalMatch) {
        const maxRound = Math.max(...lastStage.matches.map((m) => m.roundNumber));
        const finalCandidates = lastStage.matches.filter(
          (m) => m.roundNumber === maxRound && m.bracketSide !== "losers",
        );
        finalMatch =
          finalCandidates[finalCandidates.length - 1] ??
          lastStage.matches[lastStage.matches.length - 1];
      }

      if (
        finalMatch &&
        (finalMatch.status.toUpperCase() === "COMPLETE" ||
          finalMatch.status.toUpperCase() === "COMPLETED") &&
        finalMatch.result != null
      ) {
        const wSlot = finalMatch.result.winnerSlot;
        const lSlot = wSlot === 0 ? 1 : 0;
        const wPart = finalMatch.participants.find((p) => p.slot === wSlot);
        const lPart = finalMatch.participants.find((p) => p.slot === lSlot);

        if (wPart?.teamId || wPart?.teamLabel) {
          const champTeam = findTeamDetail(wPart.teamId, wPart.teamLabel, teamDetails, teams);
          const runnerUpTeam =
            lPart?.teamId || lPart?.teamLabel
              ? findTeamDetail(lPart.teamId, lPart.teamLabel, teamDetails, teams)
              : null;

          const scoreStr =
            finalMatch.result.scoreA != null && finalMatch.result.scoreB != null
              ? wSlot === 0
                ? `${finalMatch.result.scoreA} – ${finalMatch.result.scoreB}`
                : `${finalMatch.result.scoreB} – ${finalMatch.result.scoreA}`
              : finalMatch.result.scoreSummary;

          if (champTeam) {
            return {
              championTeam: champTeam,
              runnerUpTeam,
              matchScore: scoreStr,
              stageName: lastStage.name,
            };
          }
        }
      }
    }
  }

  // 2. Legacy Bracket or finalStandings fallback
  if (bracket?.finalStandings && bracket.finalStandings.length > 0) {
    const rank1 = bracket.finalStandings.find((s) => s.rank === 1);
    const rank2 = bracket.finalStandings.find((s) => s.rank === 2);
    if (rank1) {
      const champTeam = findTeamDetail(null, rank1.name, teamDetails, teams);
      const runnerUpTeam = rank2 ? findTeamDetail(null, rank2.name, teamDetails, teams) : null;
      if (champTeam) {
        return {
          championTeam: champTeam,
          runnerUpTeam,
          matchScore: rank1.record ?? null,
          stageName: "Grand Finals",
        };
      }
    }
  }

  return null;
}

function findTeamDetail(
  teamId: string | null | undefined,
  teamLabel: string | null | undefined,
  teamDetails: TournamentTeamView[],
  teams: string[],
): TournamentTeamView | null {
  if (teamId) {
    const found = teamDetails.find((t) => t.id === teamId);
    if (found) return found;
  }
  if (teamLabel) {
    const norm = teamLabel.trim().toLowerCase();
    const found = teamDetails.find((t) => t.name.trim().toLowerCase() === norm);
    if (found) return found;
    return {
      id: teamId ?? `team-${teamLabel}`,
      name: teamLabel,
      seed: null,
      logoUrl: null,
      players: [],
    };
  }
  return null;
}

type Props = {
  championData: ChampionResult;
  game?: GameSlug;
  accentHex?: string;
};

export default function TournamentChampionSection({
  championData,
  game,
}: Props) {
  const { championTeam, runnerUpTeam, matchScore } = championData;
  const isFifa = game === "EA_FC26";
  const players = championTeam.players ?? [];

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-[#0a0c10]/95 to-amber-950/25 p-6 shadow-[0_0_90px_rgba(245,158,11,0.22)] backdrop-blur-2xl sm:p-10">
      {/* Glow aura */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Main Champion Card */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {championTeam.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={championTeam.logoUrl}
              alt={championTeam.name}
              className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 font-display text-3xl font-black text-amber-300 ring-2 ring-amber-400/50 shadow-[0_0_35px_rgba(245,158,11,0.35)]">
              🏆
            </div>
          )}

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 ring-1 ring-inset ring-amber-400/40 mb-1.5">
              1st Place · Champions
            </div>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_15px_rgba(251,191,36,0.3)] sm:text-4xl">
              {championTeam.name}
            </h1>
            {runnerUpTeam ? (
              <p className="mt-1 text-xs font-medium text-white/50">
                Runner Up:&nbsp;
                <span className="font-semibold text-slate-300">{runnerUpTeam.name}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Players / Roster Section */}
      <div className="relative z-10 mt-8 border-t border-amber-400/20 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300/90 flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
            </svg>
            Champion Roster · {players.length} {players.length === 1 ? "Player" : "Players"}
          </p>
        </div>

        {players.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortByRole(players).map((player) => {
              const role = player.participantRole ?? "PLAYER";
              const badge = ROLE_BADGE[role] ?? ROLE_BADGE.PLAYER;
              const secondary = isFifa ? player.olympusId : player.riotId;
              return (
                <li
                  key={player.id}
                  className="group relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-black/40 px-4.5 py-3.5 backdrop-blur-md transition-all duration-300 hover:border-amber-400/50 hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                >
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-bold text-white truncate group-hover:text-amber-200 transition-colors">
                      {player.displayName}
                    </p>
                    {secondary ? (
                      <p className="mt-0.5 truncate text-xs text-white/50">{secondary}</p>
                    ) : null}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
                    style={{
                      background: `${badge.color}20`,
                      color: badge.color,
                      boxShadow: `inset 0 0 0 1px ${badge.color}50`,
                    }}
                  >
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs italic text-amber-200/50">
            No roster players registered for this team.
          </p>
        )}
      </div>
    </section>
  );
}
