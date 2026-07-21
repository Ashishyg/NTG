"use client";

import { useState } from "react";
import BrandIcon from "@/components/ui/BrandIcon";
import StatusBadge from "@/components/platform/ui/StatusBadge";
import TournamentBracket from "@/components/platform/tournament/TournamentBracket";
import TournamentBracketEmpty from "@/components/platform/tournament/TournamentBracketEmpty";
import TournamentFinalResults from "@/components/platform/tournament/TournamentFinalResults";
import TournamentScheduleCard from "@/components/platform/tournament/TournamentScheduleCard";

import TournamentStageBrackets from "@/components/platform/tournament/TournamentStageBrackets";
import TournamentYourGames from "@/components/platform/tournament/TournamentYourGames";
import { gameMetaFor, formatRegistrationLabel, buildTournamentScheduleCardView } from "@/lib/tournament-display";
import TournamentRegisterForm from "./TournamentRegisterForm";
import type { RegistrationPreview } from "./TournamentRegisterForm";
import type { TournamentDetail } from "@core/contracts";
import type { ValorantRegistrationProfileCard } from "@core/contracts/registration-profile";
import type { TournamentBracketView, FinalStandingView } from "@core/contracts/tournament-bracket";
import type { TournamentStagePublicView } from "@core/contracts/tournament-stages";

type ViewTab = "overview" | "brackets" | "your-games";

type Props = {
  tournament: TournamentDetail;
  bracket: TournamentBracketView | null;
  stages?: TournamentStagePublicView[];
  isLoggedIn: boolean;
  registrationPreview?: RegistrationPreview | null;
  registrationProfileCard?: ValorantRegistrationProfileCard | null;
  auctionHref?: string | null;
  auctionEnded?: boolean;
};

function SectionHeading({
  title,
  accentClass = "from-transparent to-cyan-500",
  lineClass = "from-cyan-500 to-transparent",
}: {
  title: string;
  accentClass?: string;
  lineClass?: string;
}) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className={`h-px w-8 bg-gradient-to-r ${accentClass}`} />
      <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">
        {title}
      </h2>
      <div className={`h-px flex-1 bg-gradient-to-r ${lineClass} opacity-30`} />
    </div>
  );
}

export default function TournamentDetailView({
  tournament,
  bracket,
  stages = [],
  isLoggedIn,
  registrationPreview,
  registrationProfileCard,
  auctionHref,
  auctionEnded,
}: Props) {
  const [view, setView] = useState<ViewTab>("overview");
  const meta = gameMetaFor(tournament.game);
  const dateStr = tournament.startsAt
    ? new Date(tournament.startsAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date TBA";

  const mvpPlacement = tournament.placements.find((p) => p.role === "MVP");
  const adminMvp = mvpPlacement?.user
    ? {
        displayName: mvpPlacement.user.username,
        riotId: mvpPlacement.user.riotId,
        rankTier: mvpPlacement.user.rankTier,
      }
    : mvpPlacement?.teamLabel?.trim()
      ? mvpPlacement.displayName
      : null;
  const mvp = bracket?.mvp ?? adminMvp ?? null;

  const fallbackStandings: FinalStandingView[] = [];

  const standings =
    bracket?.finalStandings && bracket.finalStandings.length > 0
      ? bracket.finalStandings.filter((s) => s.rank === 1 || s.rank === 2)
      : fallbackStandings;

  const prizeSplit =
    tournament.prizeSplit && tournament.prizeSplit.length > 0
      ? tournament.prizeSplit
      : tournament.prizePool && !isNaN(Number(tournament.prizePool))
        ? [
            { place: 1, label: "Winner", amount: Math.round(Number(tournament.prizePool) * 0.6) },
            { place: 2, label: "Runner Up", amount: Math.round(Number(tournament.prizePool) * 0.3) },
            { place: 3, label: "3rd Place", amount: Math.round(Number(tournament.prizePool) * 0.1) },
          ]
        : [];

  const showFinalResults = standings.length > 0 || Boolean(mvp);
  const hasNativeStages = stages.length > 0;
  const showLegacyBracket = Boolean(tournament.bracketUrl) && !hasNativeStages;


  const splitColors = ["text-amber-500/90", "text-slate-300/90", "text-amber-700/90"];
  const splitBadgeColors = ["bg-amber-500/20 text-amber-500", "bg-slate-300/20 text-slate-300", "bg-amber-700/20 text-amber-700"];

  const showRegistrationSection =
    tournament.registrationOpen || tournament.userRegistered;

  const scheduleCard = buildTournamentScheduleCardView({
    registrationFormat: tournament.registrationFormat,
    registrationOpensAt: tournament.registrationOpensAt,
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    auctionStartsAt: tournament.auctionStartsAt,
  });

  return (
    <article className="pb-24">
      <div className="relative mb-12 flex min-h-[24rem] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/[0.08] p-8 shadow-2xl sm:min-h-[30rem] sm:p-12">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-80"
          style={{
            backgroundImage: `url('${tournament.posterUrl ?? "/images/tournament_poster.png"}')`,
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-4">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#050505]/90 ring-1 ring-white/10 backdrop-blur-md"
              style={{ color: meta.hex, boxShadow: `0 0 50px -10px ${meta.hex}80` }}
            >
              <BrandIcon path={meta.iconPath} title={tournament.name} className="h-8 w-8 drop-shadow-md" />
            </span>
            <div className="flex flex-col items-start">
              <StatusBadge status={tournament.status} />
              <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {tournament.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white/60">
                <span>{meta.label}</span>
                {tournament.registrationFormat && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{formatRegistrationLabel(tournament.registrationFormat)}</span>
                  </>
                )}
                {dateStr && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{dateStr}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 flex rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1 sm:max-w-xl">
        <button
          type="button"
          onClick={() => setView("overview")}
          className={`relative z-10 flex-1 cursor-pointer rounded-xl py-3 text-center text-xs font-bold uppercase tracking-[0.2em] transition ${
            view === "overview" ? "text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          Overview
          {view === "overview" ? (
            <span
              className="absolute inset-0 -z-10 rounded-xl border border-cyan-500/35 bg-gradient-to-r from-cyan-500/20 to-sky-500/10 shadow-[0_0_16px_rgba(6,182,212,0.18)]"
              aria-hidden
            />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setView("brackets")}
          className={`relative z-10 flex-1 cursor-pointer rounded-xl py-3 text-center text-xs font-bold uppercase tracking-[0.2em] transition ${
            view === "brackets" ? "text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          Brackets
          {view === "brackets" ? (
            <span
              className="absolute inset-0 -z-10 rounded-xl border border-rose-500/35 bg-gradient-to-r from-rose-500/20 to-orange-500/10 shadow-[0_0_16px_rgba(244,63,94,0.18)]"
              aria-hidden
            />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setView("your-games")}
          className={`relative z-10 flex-1 cursor-pointer rounded-xl py-3 text-center text-xs font-bold uppercase tracking-[0.2em] transition ${
            view === "your-games" ? "text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          Your Games
          {view === "your-games" ? (
            <span
              className="absolute inset-0 -z-10 rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 shadow-[0_0_16px_rgba(16,185,129,0.18)]"
              aria-hidden
            />
          ) : null}
        </button>
      </div>

      {view === "overview" ? (
      <section className="mt-4">
        <SectionHeading
          title="Overview"
          accentClass="from-transparent to-cyan-500"
          lineClass="from-cyan-500 to-transparent"
        />

        <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:items-start">
          <div className="order-1 space-y-16 lg:col-start-1 lg:row-start-1">
            {tournament.description ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                  {tournament.description}
                </p>
              </div>
            ) : null}

            {showRegistrationSection ? (
              <TournamentRegisterForm
                layout="featured"
                slug={tournament.slug}
                game={tournament.game}
                registrationFormat={tournament.registrationFormat}
                isLoggedIn={isLoggedIn}
                alreadyRegistered={tournament.userRegistered}
                registrationOpen={tournament.registrationOpen}
                rulebookUrl={tournament.rulebookUrl}
                preview={registrationPreview ?? null}
                coCaptainSlots={tournament.coCaptainSlots}
                registrationProfileCard={registrationProfileCard ?? null}
                userParticipantRole={tournament.userParticipantRole}
              />
            ) : null}
          </div>

          <aside className="order-2 space-y-8 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <TournamentScheduleCard schedule={scheduleCard} />

            {auctionHref ? (
              <div className="group relative overflow-hidden rounded-[1.25rem] p-[1px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 opacity-90 transition-all duration-300 group-hover:opacity-100" />

                <a
                  href={auctionHref}
                  className="relative block w-full rounded-[19px] bg-[#0c0c0e]/95 px-6 py-4.5 text-center text-xs font-bold uppercase tracking-[0.25em] text-white transition-all duration-300 group-hover:bg-[#0c0c0e]/75"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    Enter Live Auction
                  </span>
                </a>
              </div>
            ) : auctionEnded ? (
              <div className="rounded-[1.25rem] border border-white/[0.06] bg-[#0c0c0e]/40 p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Auction Ended
                </span>
              </div>
            ) : null}

            {(tournament.prizePool || tournament.prizeNotes) && (
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#0A0A0A]/80 p-8 shadow-2xl backdrop-blur-xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">Prizepool</p>
                {tournament.prizePool ? (
                  <p className="mt-2 font-display text-4xl font-black tracking-tight text-white drop-shadow-md">
                    ₹{Number(tournament.prizePool).toLocaleString("en-IN")}
                  </p>
                ) : null}
                {tournament.prizeNotes ? (
                  <p className="mt-3 text-sm font-medium leading-relaxed text-white/50">
                    {tournament.prizeNotes}
                  </p>
                ) : null}

                {prizeSplit.length > 0 ? (
                  <div className="mt-6 border-t border-white/[0.06] pt-6">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                      Prize Split
                    </p>
                    <div className="space-y-3">
                      {prizeSplit.map((row, i) => (
                        <div key={row.place} className="flex items-center justify-between">
                          <span className={`flex items-center gap-2 text-sm font-medium ${splitColors[i] ?? "text-white/70"}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${splitBadgeColors[i] ?? "bg-white/10 text-white/70"}`}>
                              {row.place}
                            </span>
                            {row.label}
                          </span>
                          <span className="font-display font-bold text-white/90">
                            ₹{row.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </aside>


        </div>
      </section>
      ) : view === "brackets" ? (
      <section className="mt-4">
        <SectionHeading
          title="Brackets"
          accentClass="from-transparent to-rose-500"
          lineClass="from-rose-500 to-transparent"
        />

        {hasNativeStages ? (
          <TournamentStageBrackets stages={stages} accentHex={meta.hex} />
        ) : showLegacyBracket && tournament.bracketUrl ? (
          bracket ? (
            <TournamentBracket bracket={bracket} accentHex={meta.hex} />
          ) : (
            <TournamentBracketEmpty url={tournament.bracketUrl} />
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-12 text-center">
            <p className="text-sm font-medium text-white/50">
              Seedings &amp; brackets will appear here.
            </p>
          </div>
        )}

        {showFinalResults ? (
          <div className="mt-16">
            <TournamentFinalResults standings={standings} mvp={mvp} />
          </div>
        ) : null}
      </section>
      ) : (
      <section className="mt-4">
        <SectionHeading
          title="Your Games"
          accentClass="from-transparent to-emerald-500"
          lineClass="from-emerald-500 to-transparent"
        />
        <TournamentYourGames slug={tournament.slug} isLoggedIn={isLoggedIn} />
      </section>
      )}
    </article>
  );
}
