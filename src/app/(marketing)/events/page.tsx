import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { whatsappInquiryUrl } from "@/lib/env";
import { hostInquiryWhatsappMessage } from "@/lib/inquiry-messages";
import { SITE_NAME } from "@/lib/site";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: `Private Events & Venue Rental | ${SITE_NAME}`,
  description: "Take over NTG Lounge for community tournaments, collegiate cups, corporate team building, or private meetups.",
};

export default function PrivateEventsPage() {
  return (
    <main id="main-content" className="relative min-h-screen">
      <div className="relative pt-24 pb-16">
        {/* Background elements */}
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center opacity-40 overflow-hidden">
          <div className="h-[50rem] w-[50rem] rounded-full bg-[var(--color-brand)]/5 blur-[150px] -translate-y-1/2" />
          <div className="h-[40rem] w-[40rem] rounded-full bg-[var(--color-iris)]/10 blur-[120px] translate-y-1/2" />
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
              Venue Takeover
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold tracking-tight text-white sm:text-7xl">
              Take over the <span className="text-gradient-iris">lounge.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/60 sm:text-lg">
              From collegiate matches and community cups to brand launches and private gaming sessions, make your next event legendary at Mangaluru's premier esports hub.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <a
                href={whatsappInquiryUrl(hostInquiryWhatsappMessage("events"))}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-[12px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-gray-200 hover:scale-105"
              >
                <span>Book Your Event</span>
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mx-auto max-w-7xl px-5 mb-32">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Full Venue Rental",
                desc: "Get exclusive access to all premium PC rigs, PlayStation 5 consoles, and lounge amenities for up to 50 guests.",
                icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              },
              {
                title: "Tournament Production",
                desc: "Professional brackets setup, tournament-grade server options, observer feeds, and streaming capabilities.",
                icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              },
              {
                title: "Dedicated Event Support",
                desc: "On-site tech support to ensure zero game downtime, catering logistics help, and custom setup options.",
                icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              },
            ].map((feature, i) => (
              <div key={i} className="group relative rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-md transition-all hover:bg-white/[0.04]">
                <div className="absolute inset-x-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-iris)]/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-iris)]/10 text-[var(--color-iris)] ring-1 ring-inset ring-[var(--color-iris)]/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                  </svg>
                </div>
                <h3 className="font-display text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Image Gallery */}
        <div className="mx-auto max-w-7xl px-5 mb-24">
          <div className="grid h-[400px] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 bg-white/5">
              <Image src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop" alt="Esports event setup" fill className="object-cover transition-transform hover:scale-105 duration-700" />
            </div>
            <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 bg-white/5 hidden sm:block">
              <Image src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop" alt="Gamers focused" fill className="object-cover transition-transform hover:scale-105 duration-700" />
            </div>
            <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 bg-white/5 hidden md:block">
              <Image src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop" alt="High performance setups" fill className="object-cover transition-transform hover:scale-105 duration-700" />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
