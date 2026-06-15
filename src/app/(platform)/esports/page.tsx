import Link from "next/link";
import { getActiveRegistrationBanner, listTournamentPreviews } from "@tournaments-leagues/index";
import { toTournamentDisplay } from "@/lib/tournament-display";

export const metadata = {
  title: "Esports — NTG Lounge",
};

export default async function EsportsHubPage() {
  const [tournaments, registration] = await Promise.all([
    listTournamentPreviews(),
    getActiveRegistrationBanner(),
  ]);

  const openCount = tournaments.filter(
    (t) => t.status === "REGISTRATION_OPEN" || t.status === "IN_PROGRESS",
  ).length;
  const completedCount = tournaments.filter((t) => t.status === "COMPLETED").length;
  const nextTourney =
    registration?.title ??
    tournaments.find((t) => t.status === "REGISTRATION_OPEN" || t.status === "DRAFT")?.name ??
    "—";

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* HERO SECTION */}
      <section className="relative mt-8 text-center sm:mt-12">
        <div className="mx-auto mb-8 inline-flex items-center gap-2.5 rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-brand)] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          </span>
          NTG Competitive Season
        </div>
        <h1 className="font-display text-5xl font-black tracking-tight text-white drop-shadow-lg sm:text-7xl">
          PLAY. RANK. <span className="bg-gradient-to-r from-[var(--color-iris)] to-[var(--color-brand)] bg-clip-text text-transparent">WIN.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-white/50 sm:text-lg">
          The ultimate competitive hub for Mangaluru. Browse live cups, climb the town leaderboards, and build your legacy from the ground up.
        </p>
      </section>

      {/* FEATURED REGISTRATION (BENTO HERO) */}
      {registration && (
        <Link
          href={registration.href}
          prefetch={true}
          className="group relative flex min-h-[16rem] flex-col justify-end overflow-hidden rounded-[2rem] bg-[#0A0A0A] ring-1 ring-inset ring-white/[0.08] p-8 shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:ring-white/20 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] active:scale-[0.98] sm:min-h-[22rem] sm:p-12"
        >
          {/* Background Image */}
          <div className="absolute inset-0 z-0 bg-[url('/images/fc26-bg.png')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105" />
          
          {/* Glass & Glow Effects */}
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-[#0A0A0A]/80 to-[#0A0A0A]/20" />
          <div className="absolute -right-20 -top-20 z-0 h-64 w-64 rounded-full bg-[var(--color-brand)]/20 blur-[100px] transition-all duration-500 group-hover:bg-[var(--color-brand)]/30" />
          <div className="absolute -bottom-32 -left-32 z-0 h-96 w-96 rounded-full bg-[var(--color-iris)]/10 blur-[100px]" />
          
          <div className="relative z-10 flex flex-col justify-between h-full w-full gap-8 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                Registration Open
              </div>
              <h2 className="font-display text-4xl font-black uppercase tracking-tight text-white drop-shadow-md sm:text-5xl">
                {registration.title}
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-white/60 sm:text-base">
                {registration.detail}
              </p>
            </div>
            
            <div className="shrink-0">
              <span className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-white px-8 text-[12px] font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all group-hover:bg-[var(--color-brand)] group-hover:text-black group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] sm:w-auto">
                Register Now
                <svg className="ml-2.5 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/esports/tournaments" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0F0F0F] p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-iris)]/40 hover:bg-[#151515] hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] active:scale-[0.98]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-[var(--color-iris)]/10 blur-[50px] transition-all group-hover:bg-[var(--color-iris)]/20" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-iris)]/10 text-[var(--color-iris)] ring-1 ring-inset ring-[var(--color-iris)]/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="relative z-10 mt-auto pt-8">
            <h3 className="font-display text-2xl font-bold tracking-wide text-white">Cups Archive</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/50">{tournaments.length} tournaments — browse past events, open cups, and detailed results.</p>
          </div>
        </Link>

        <Link href="/esports/leaderboard" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0F0F0F] p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand)]/40 hover:bg-[#151515] hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] active:scale-[0.98]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-[var(--color-brand)]/10 blur-[50px] transition-all group-hover:bg-[var(--color-brand)]/20" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-1 ring-inset ring-[var(--color-brand)]/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z" />
            </svg>
          </div>
          <div className="relative z-10 mt-auto pt-8">
            <h3 className="font-display text-2xl font-bold tracking-wide text-white">Valorant Rankings</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/50">Who runs Mangaluru? Live competitive RR from NTG players with linked Riot IDs.</p>
          </div>
        </Link>

        <Link href="/gallery" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0F0F0F] p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#F43F5E]/40 hover:bg-[#151515] hover:shadow-[0_0_30px_rgba(244,63,94,0.15)] active:scale-[0.98]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-[#F43F5E]/10 blur-[50px] transition-all group-hover:bg-[#F43F5E]/20" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F43F5E]/10 text-[#F43F5E] ring-1 ring-inset ring-[#F43F5E]/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="relative z-10 mt-auto pt-8">
            <h3 className="font-display text-2xl font-bold tracking-wide text-white">Moments</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/50">Highlights, finals nights, and the vibe — straight from our live events.</p>
          </div>
        </Link>
      </div>

      {/* STATS RIBBON */}
      <div className="mt-6 flex flex-col items-center justify-between gap-8 rounded-[2rem] border border-white/[0.04] bg-[#0A0A0A]/50 px-8 py-10 shadow-inner backdrop-blur-sm sm:flex-row sm:px-16">
        <div className="text-center sm:text-left">
          <p className="font-display text-4xl font-black tracking-tight text-white">{openCount}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-brand)]">Active Cups</p>
        </div>
        
        <div className="hidden h-12 w-px bg-white/10 sm:block" />

        <div className="text-center sm:text-left">
          <p className="font-display text-4xl font-black tracking-tight text-white">{completedCount}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">Completed</p>
        </div>

        <div className="hidden h-12 w-px bg-white/10 sm:block" />

        <div className="text-center sm:text-right">
          <p className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl max-w-[200px] truncate">
            {nextTourney}
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-iris)]">Next Tourney</p>
        </div>
      </div>
    </div>
  );
}
