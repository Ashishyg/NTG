import Link from "next/link";
import type { RosterTeamView } from "@core/contracts/roster-listings";

type Props = {
  team: RosterTeamView;
};

/** Formats a future date as "July 15, 2026" + "in X days" */
function formatOpenDate(isoString: string): { dateStr: string; daysAway: number } {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const daysAway = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const dateStr = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return { dateStr, daysAway };
}

export default function TryoutOpeningBanner({ team }: Props) {
  // Nothing to show if no date set
  if (!team.tryoutsOpenAt) return null;

  const openDate = new Date(team.tryoutsOpenAt);
  const now = new Date();
  const isPast = openDate.getTime() <= now.getTime();
  const { dateStr, daysAway } = formatOpenDate(team.tryoutsOpenAt);

  if (isPast) {
    // Date is past — tryouts are open or recently opened
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-4">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-300">
            Tryouts are open for NTG {team.gameLabel}!
          </p>
          <p className="text-xs text-white/45 mt-0.5">Applications opened on {dateStr}</p>
        </div>
        {team.tryoutListingSlug ? (
          <Link
            href={`/listings/${team.tryoutListingSlug}`}
            className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/25 transition-colors"
          >
            Apply Now →
          </Link>
        ) : null}
      </div>
    );
  }

  // Date is in the future — show countdown
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--color-iris)]/20 bg-gradient-to-r from-[var(--color-iris)]/[0.06] to-transparent px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-iris)]/10 ring-1 ring-inset ring-[var(--color-iris)]/20">
        <svg className="h-5 w-5 text-[var(--color-iris)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-iris)]/70">
          Next tryout window
        </p>
        <p className="text-sm font-semibold text-white mt-0.5">
          {dateStr}
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          {daysAway === 1
            ? "Opening tomorrow — check back soon"
            : `Opening in ${daysAway} days — check back then`}
        </p>
      </div>
    </div>
  );
}

export function RecruitingGamePanel({ team }: Props) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--color-iris)]/15 bg-gradient-to-br from-[var(--color-iris)]/[0.05] to-transparent p-8 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--color-iris)]/70">Recruiting</p>
      <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
        Building the NTG {team.gameLabel} Roster
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/50">
        Spots are limited. Join NTG as a member, complete your game profile, and apply when applications open.
      </p>
      {team.tryoutListingSlug ? (
        <Link
          href={`/listings/${team.tryoutListingSlug}`}
          className="cta mt-6 inline-flex rounded-full px-8 py-3 text-xs font-semibold uppercase tracking-[0.18em]"
        >
          View application
        </Link>
      ) : (
        <Link
          href="/listings?type=ROSTER_TRYOUT"
          className="cta mt-6 inline-flex rounded-full px-8 py-3 text-xs font-semibold uppercase tracking-[0.18em]"
        >
          Browse tryouts
        </Link>
      )}
    </section>
  );
}
