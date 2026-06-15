import BrandIcon from "@/components/ui/BrandIcon";
import StatusBadge from "@/components/platform/ui/StatusBadge";
import { gameMetaFor } from "@/lib/tournament-display";
import TournamentRegisterForm from "./TournamentRegisterForm";
import type { TournamentDetail } from "@core/contracts";

type Props = {
  tournament: TournamentDetail;
  isLoggedIn: boolean;
  previewName?: string | null;
  previewRiotId?: string | null;
};

export default function TournamentDetailView({
  tournament,
  isLoggedIn,
  previewName,
  previewRiotId,
}: Props) {
  const meta = gameMetaFor(tournament.game);
  const dateStr = tournament.startsAt
    ? new Date(tournament.startsAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date TBA";

  const champ = tournament.placements.find((p) => p.role === "CHAMPION");
  const mvp = tournament.placements.find((p) => p.role === "MVP");
  const runnerUp = tournament.placements.find((p) => p.role === "RUNNER_UP");

  return (
    <article className="pb-24">
      {/* MASSIVE POSTER HERO */}
      <div className="relative mb-12 flex min-h-[24rem] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/[0.08] p-8 shadow-2xl sm:min-h-[30rem] sm:p-12">
        <div className="absolute inset-0 z-0 bg-[url('/images/tournament_poster.png')] bg-cover bg-center opacity-80" />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-6">
            <span
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#050505]/90 ring-1 ring-white/10 backdrop-blur-md"
              style={{ color: meta.hex, boxShadow: `0 0 50px -10px ${meta.hex}80` }}
            >
              <BrandIcon path={meta.iconPath} title={tournament.name} className="h-10 w-10 drop-shadow-md" />
            </span>
            <div>
              <StatusBadge status={tournament.status} />
              <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {tournament.name}
              </h1>
              <div className="mt-4 flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white/60">
                <span>{tournament.gameLabel ?? meta.label}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>{dateStr}</span>
                {tournament.seasonLabel && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span style={{ color: meta.hex }}>{tournament.seasonLabel}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-16">
          
          {/* GRAND CHAMPIONS & MVP */}
          {(champ || mvp) && (
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--color-brand)]" />
                <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">Results & Honors</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-brand)] to-transparent opacity-30" />
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                {champ && (
                  <div className="group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-amber-500/10 to-transparent p-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="relative flex h-full flex-col items-center justify-center rounded-[1.4rem] border border-amber-500/20 bg-[#0A0A0A]/90 px-6 py-10 text-center backdrop-blur-xl">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/80">Champion</p>
                      <p className="mt-2 font-display text-3xl font-black tracking-wide text-white drop-shadow-md">{champ.displayName}</p>
                    </div>
                  </div>
                )}
                
                {mvp && (
                  <div className="group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[var(--color-iris)]/10 to-transparent p-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-iris)]/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="relative flex h-full flex-col items-center justify-center rounded-[1.4rem] border border-[var(--color-iris)]/20 bg-[#0A0A0A]/90 px-6 py-10 text-center backdrop-blur-xl">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-iris)]/30 bg-[var(--color-iris)]/10 text-[var(--color-iris)] shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-iris)]/80">Tournament MVP</p>
                      <p className="mt-2 font-display text-3xl font-black tracking-wide text-white drop-shadow-md">{mvp.displayName}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {runnerUp && (
                <div className="group relative mt-4 overflow-hidden rounded-[1.25rem] bg-gradient-to-r from-slate-400/10 via-transparent to-transparent p-1">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative flex items-center gap-5 rounded-xl border border-slate-400/20 bg-[#0A0A0A]/90 px-6 py-5 backdrop-blur-xl">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-400/30 bg-slate-400/10 text-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.15)]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400/80">Runner Up</p>
                      <p className="mt-1 font-display text-2xl font-black tracking-wide text-white drop-shadow-sm">{runnerUp.displayName}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* KEY RULES SECTION */}
          <section>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-emerald-500" />
              <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">Key Rules</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/[0.06] bg-[#0A0A0A]/50 p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/60 ring-1 ring-white/10">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold text-white">Reporting Time</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">All teams must check-in to the lounge at least 30 minutes prior to their match start time.</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/[0.06] bg-[#0A0A0A]/50 p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/60 ring-1 ring-white/10">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold text-white">Fair Play</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">Any form of cheating or exploiting bugs will result in an immediate tournament ban.</p>
              </div>
            </div>
          </section>

          {/* BRACKET SECTION */}
          {tournament.matches.length > 0 && (
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-rose-500" />
                <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">Match Bracket</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-rose-500 to-transparent opacity-30" />
              </div>
              
              <div className="space-y-4">
                {tournament.matches.map((m) => (
                  <div key={m.id} className="relative flex flex-col overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-[#0A0A0A] shadow-xl sm:flex-row">
                    <div className="flex w-full flex-col justify-center gap-4 bg-white/[0.02] p-5 sm:w-2/3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                          Round {m.roundNumber} <span className="mx-2 text-white/10">|</span> Match {m.positionInRound}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 rounded-lg border border-white/[0.04] bg-[#050505] px-4 py-3 text-center font-display font-semibold text-white/90">
                          {m.participants[0]?.label ?? "TBD"}
                        </div>
                        <span className="text-[10px] font-bold uppercase text-white/20">VS</span>
                        <div className="flex-1 rounded-lg border border-white/[0.04] bg-[#050505] px-4 py-3 text-center font-display font-semibold text-white/90">
                          {m.participants[1]?.label ?? "TBD"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex w-full flex-col justify-center border-t border-white/[0.06] bg-gradient-to-br from-rose-500/5 to-transparent p-5 sm:w-1/3 sm:border-l sm:border-t-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500/70">Final Score</p>
                      <p className="mt-1 font-display text-xl font-bold text-white drop-shadow-sm">
                        {m.scoreSummary || "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        <aside className="space-y-8">
          <div className="sticky top-24">
            {(tournament.prizePool || tournament.prizeNotes) && (
              <div className="mb-8 rounded-[1.5rem] border border-white/[0.08] bg-[#0A0A0A]/80 p-8 shadow-2xl backdrop-blur-xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">Prizepool</p>
                {tournament.prizePool ? (
                  <p className="mt-2 font-display text-4xl font-black tracking-tight text-white drop-shadow-md">
                    ₹{Number(tournament.prizePool).toLocaleString("en-IN")}
                  </p>
                ) : null}
                {tournament.prizeNotes ? (
                  <p className="mt-3 text-sm font-medium leading-relaxed text-white/50">{tournament.prizeNotes}</p>
                ) : null}

                {/* PRIZE SPLIT */}
                {tournament.prizePool && !isNaN(Number(tournament.prizePool)) && (
                  <div className="mt-6 border-t border-white/[0.06] pt-6">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Prize Split</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-amber-500/90">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-[10px] font-bold text-amber-500">1</span>
                          Winner
                        </span>
                        <span className="font-display font-bold text-white/90">₹{(Number(tournament.prizePool) * 0.6).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-300/90">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-300/20 text-[10px] font-bold text-slate-300">2</span>
                          Runner Up
                        </span>
                        <span className="font-display font-bold text-white/90">₹{(Number(tournament.prizePool) * 0.3).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-amber-700/90">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-700/20 text-[10px] font-bold text-amber-700">3</span>
                          3rd Place
                        </span>
                        <span className="font-display font-bold text-white/90">₹{(Number(tournament.prizePool) * 0.1).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {(tournament.registrationOpen || tournament.registrationCount > 0) && (
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] p-8 shadow-xl backdrop-blur-md">
                <TournamentRegisterForm
                  slug={tournament.slug}
                  isLoggedIn={isLoggedIn}
                  alreadyRegistered={tournament.userRegistered}
                  registrationOpen={tournament.registrationOpen}
                  previewName={previewName}
                  previewRiotId={previewRiotId}
                />
                {tournament.registrationCount > 0 && (
                  <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-white/40">
                    {tournament.registrationCount}{" "}
                    {tournament.registrationCount === 1 ? "Player" : "Players"} Registered
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
