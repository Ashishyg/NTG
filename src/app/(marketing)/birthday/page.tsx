import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { whatsappInquiryUrl } from "@/lib/env";
import { hostInquiryWhatsappMessage } from "@/lib/inquiry-messages";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Birthdays & Parties | ${SITE_NAME}`,
  description: "Host an unforgettable birthday party at Mangaluru's premier gaming lounge.",
};

export default function BirthdayPage() {
  return (
    <div className="relative min-h-screen pt-24 pb-32">
      {/* Background elements */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center opacity-40 overflow-hidden">
        <div className="h-[50rem] w-[50rem] rounded-full bg-[var(--color-iris)]/10 blur-[150px] -translate-y-1/2" />
      </div>

      <div className="mx-auto max-w-5xl px-5 mt-12 mb-20">
        <Link
          href="/#plans"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-white/70 mb-8"
        >
          ← Back to plans
        </Link>

        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-iris)]/30 bg-[var(--color-iris)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-iris)]">
            <span className="flex h-2 w-2 rounded-full bg-[var(--color-iris)] animate-pulse" />
            Birthday Hosting
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Your best <span className="text-gradient-iris">party</span> yet.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/60 sm:text-lg">
            Take over NTG Lounge for an epic gaming session with your friends. From casual get-togethers to fully organized mini-tournaments, we provide the ultimate venue for your special day.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <a
              href={whatsappInquiryUrl(hostInquiryWhatsappMessage("birthday"))}
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
              title: "Exclusive Access",
              desc: "Rent our private room or take over the entire lounge for you and your guests.",
              icon: "M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            },
            {
              title: "Custom Tournaments",
              desc: "We'll set up brackets and scoreboards for your group in Valorant, FIFA, or any game.",
              icon: "M13 10V3L4 14h7v7l9-11h-7z"
            },
            {
              title: "Bring Your Own Catering",
              desc: "Feel free to bring a cake, pizza, and drinks. We have tables ready for your setup.",
              icon: "M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
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
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid h-[400px] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 bg-white/5">
            <Image src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop" alt="Gaming Setup" fill className="object-cover transition-transform hover:scale-105 duration-700" />
          </div>
          <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 bg-white/5 hidden sm:block">
            <Image src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop" alt="Party Environment" fill className="object-cover transition-transform hover:scale-105 duration-700" />
          </div>
          <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 bg-white/5 hidden md:block">
            <Image src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop" alt="Friends playing games" fill className="object-cover transition-transform hover:scale-105 duration-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
