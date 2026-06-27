import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { sponsorEmail } from "@/lib/env";
import { SITE_NAME } from "@/lib/site";
import { listActiveSponsorLogos } from "@/modules/lounge-commerce";

export const metadata: Metadata = {
  title: `Sponsorships | ${SITE_NAME}`,
  description: "Partner with Mangaluru's Premier Esports Lounge and put your brand in front of our highly engaged community.",
};

export default async function SponsorsPage() {
  const dbSponsors = await listActiveSponsorLogos();

  return (
    <div className="relative min-h-screen pt-24 pb-32">
      {/* Background elements */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center opacity-40 overflow-hidden">
        <div className="h-[50rem] w-[50rem] rounded-full bg-[var(--color-brand)]/10 blur-[150px] -translate-y-1/2" />
        <div className="h-[40rem] w-[40rem] rounded-full bg-[var(--color-iris)]/5 blur-[120px] translate-y-1/2" />
      </div>

      <div className="mx-auto max-w-5xl px-5 mt-12 mb-20">
        <Link
          href="/#plans"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-white/70 mb-8"
        >
          ← Back to plans
        </Link>

        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-brand)]">
          <span className="flex h-2 w-2 rounded-full bg-[var(--color-brand)] animate-pulse" />
          Partner With Us
        </span>
        <h1 className="mt-6 font-display text-5xl font-bold tracking-tight text-white sm:text-7xl">
          Fuel the <span className="text-gradient-brand">community.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/60 sm:text-lg">
          Put your brand in front of Mangaluru's most engaged and competitive gaming audience. From in-lounge branding to tournament naming rights, let's build something epic together.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <a
            href={`mailto:${sponsorEmail}?subject=Sponsorship Inquiry - NTG Lounge`}
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-[12px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-gray-200 hover:scale-105"
          >
            <span>Inquire via Email</span>
          </a>
        </div>
      </div>
    </div>

      {/* Featured Sponsors Section (AUC CUP II) */}
      <div className="mx-auto max-w-5xl px-5 mb-32">
        <div className="mb-12 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-iris)]">
            Tournament Partner Showcase
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">AUC CUP II Sponsors</h2>
          <p className="mt-4 text-[15px] text-white/60">
            We are proud to have partnered with these industry giants for the iconic **NTG Auction Cup II**.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto items-stretch">
          {/* AMD Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[32px] border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[#FF2400]/30 hover:bg-white/[0.04]">
            {/* Subtle glow */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                 style={{ background: "radial-gradient(circle at 50% 0%, rgba(255,36,0,0.08) 0%, transparent 70%)" }} />
            <div>
              <div className="flex h-16 w-36 items-center justify-center rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10 mb-8 transition-colors group-hover:bg-white/[0.06]">
                <div className="relative h-full w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=200&h=120&fit=crop"
                    alt="AMD Logo"
                    fill
                    className="object-contain grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                  />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">AMD</h3>
              <p className="text-sm leading-relaxed text-white/60">
                Official hardware partner of **NTG Auction Cup II**. Powering our high-end competitive battle stations with industry-leading processors to ensure maximum performance and seamless play.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
              <a
                href="https://www.amd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-brand)] transition-colors hover:text-emerald-300"
              >
                Visit Website
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>

          {/* GIGABYTE AORUS Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[32px] border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-brand)]/30 hover:bg-white/[0.04]">
            {/* Subtle glow */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                 style={{ background: "radial-gradient(circle at 50% 0%, rgba(52,211,153,0.08) 0%, transparent 70%)" }} />
            <div>
              <div className="flex h-16 w-36 items-center justify-center rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10 mb-8 transition-colors group-hover:bg-white/[0.06]">
                <div className="relative h-full w-full">
                  <Image
                    src="/gigabyte.svg"
                    alt="AORUS Logo"
                    fill
                    className="object-contain grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                  />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">AORUS</h3>
              <p className="text-sm leading-relaxed text-white/60">
                Official hardware partner of **NTG Auction Cup II**. Providing elite graphics cards and motherboard architecture to deliver top-tier framerates and ultimate reliability for tournament play.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
              <a
                href="https://aorus.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-brand)] transition-colors hover:text-emerald-300"
              >
                Visit Website
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Sponsors Wall (For any other sponsors in DB) */}
      {dbSponsors.length > 2 && (
        <div className="mx-auto max-w-7xl px-5 mb-32">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">More Partners</h2>
            <p className="mt-4 text-[15px] text-white/60">The brands that power our competitive season and gaming community.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 justify-items-center items-center">
            {dbSponsors.filter(s => s.name !== "AMD" && s.name !== "AORUS").map((logo) => (
              <a
                key={logo.id}
                href={logo.websiteUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex h-24 w-full items-center justify-center rounded-[20px] border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5"
                title={logo.name}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={logo.logoUrl}
                    alt={logo.name}
                    fill
                    className="object-contain grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                  />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Stats/Why NTG */}
      <div className="mx-auto max-w-7xl px-5 mb-32">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: "500+", label: "Active Members" },
            { value: "50+", label: "Monthly Tournaments" },
            { value: "10k+", label: "Social Reach" },
            { value: "Top Tier", label: "Gaming Specs" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02] py-10 px-6 backdrop-blur-md">
              <span className="font-display text-4xl font-bold text-white">{stat.value}</span>
              <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-white/50">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sponsorship Tiers */}
      <div className="mx-auto max-w-7xl px-5 mb-32">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Sponsorship Tiers</h2>
          <p className="mt-4 text-[15px] text-white/60">Choose the level of engagement that fits your brand.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              name: "Bronze",
              price: "Custom",
              perks: ["Logo on Sponsor Wall", "Social Media Mentions", "In-Lounge Display Ad (Shared)"]
            },
            {
              name: "Silver",
              price: "Custom",
              isPopular: true,
              perks: ["Everything in Bronze", "Tournament Co-Branding", "Dedicated In-Lounge Ad Space", "Product Placement"]
            },
            {
              name: "Title Sponsor",
              price: "Custom",
              perks: ["Everything in Silver", "Naming Rights to Major Events", "Full Lounge Branding Takeover", "VIP Lounge Access Cards"]
            }
          ].map((tier, i) => (
            <div key={i} className={`relative flex flex-col rounded-[24px] border p-8 backdrop-blur-md transition-all ${tier.isPopular ? 'border-[var(--color-brand)]/50 bg-[var(--color-brand)]/5 hover:bg-[var(--color-brand)]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
              {tier.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/20 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand)] backdrop-blur-xl">
                  Most Popular
                </span>
              )}
              <h3 className="font-display text-2xl font-bold text-white">{tier.name}</h3>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-white/40">Rates on Request</p>
              
              <ul className="mt-8 mb-8 flex-1 space-y-4 text-[14px] text-white/70">
                {tier.perks.map((perk, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="leading-snug">{perk}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`mailto:${sponsorEmail}?subject=Sponsorship Inquiry - ${tier.name}`}
                className={`mt-auto inline-flex w-full items-center justify-center rounded-full px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${tier.isPopular ? 'bg-[var(--color-brand)] text-black hover:bg-emerald-300' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                Inquire via Email
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
