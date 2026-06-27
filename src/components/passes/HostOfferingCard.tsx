"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { HostOfferingView, SponsorLogoView } from "@lounge-commerce/domain/types";
import { hostInquiryWhatsappMessage, type HostInquiryTopic } from "@/lib/inquiry-messages";
import { whatsappInquiryUrl } from "@/lib/env";

const TOPIC_MAP: Record<HostOfferingView["type"], HostInquiryTopic | null> = {
  SPONSORSHIP: "sponsor",
  BIRTHDAY: "birthday",
  PRIVATE_EVENT: "events",
};

const HOST_PATH: Record<HostOfferingView["type"], string> = {
  SPONSORSHIP: "/sponsors",
  BIRTHDAY: "/birthday",
  PRIVATE_EVENT: "/events",
};

export default function HostOfferingCard({
  offering,
  sponsorLogos = [],
}: {
  offering: HostOfferingView;
  sponsorLogos?: SponsorLogoView[];
}) {
  const topic = TOPIC_MAP[offering.type];
  const isSponsor = offering.type === "SPONSORSHIP";
  const highlights = offering.highlights.slice(0, 3);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-iris)]/30 hover:bg-white/[0.04] hover:shadow-[0_8px_32px_-8px_rgba(124,58,237,0.15)]"
    >
      {/* Subtle top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-colors duration-500 group-hover:via-[var(--color-iris)]/50" />
      
      {/* Hover radial glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
           style={{ background: "radial-gradient(circle at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)" }} />

      <div className="relative z-10">
        <h3 className="font-display text-2xl font-bold tracking-tight text-white/95 transition-colors group-hover:text-white">{offering.title}</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-white/60">{offering.summary}</p>
      </div>

      {isSponsor && sponsorLogos.length > 0 ? (
        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          {sponsorLogos.slice(0, 5).map((logo) => (
            <div
              key={logo.id}
              className="relative h-11 w-[72px] overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 transition-all group-hover:bg-white/[0.06] group-hover:ring-white/20"
            >
              <Image src={logo.logoUrl} alt={logo.name} fill className="object-contain p-2 grayscale opacity-70 transition-all group-hover:grayscale-0 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      ) : highlights.length > 0 ? (
        <ul className="relative z-10 mt-5 space-y-2.5 text-[13px] text-white/55">
          {highlights.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <svg className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[var(--color-iris)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="leading-snug">{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative z-10 mt-auto flex flex-wrap gap-3 pt-7">
        <Link
          href={HOST_PATH[offering.type]}
          className="group/btn relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 transition-all hover:border-[var(--color-iris)]/40 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.1)]"
        >
          <span>Learn more</span>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </motion.article>
  );
}
