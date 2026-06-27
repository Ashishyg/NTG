import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import {
  getHostOfferingByType,
  listActiveSponsorLogos,
} from "@lounge-commerce/index";
import { hostInquiryWhatsappMessage, type HostInquiryTopic } from "@/lib/inquiry-messages";
import { whatsappInquiryUrl } from "@/lib/env";
import { serverEnv } from "@core/config/env.server";
import type { HostOfferingType } from "@prisma/client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const TOPIC_TO_TYPE: Record<string, HostOfferingType> = {
  sponsor: "SPONSORSHIP",
  birthday: "BIRTHDAY",
  events: "PRIVATE_EVENT",
};

const TOPIC_TO_INQUIRY: Record<string, HostInquiryTopic> = {
  sponsor: "sponsor",
  birthday: "birthday",
  events: "events",
};

type Props = {
  searchParams: Promise<{ topic?: string }>;
};

export async function generateMetadata({ searchParams }: Props) {
  const { topic = "sponsor" } = await searchParams;
  const titles: Record<string, string> = {
    sponsor: "Sponsorship",
    birthday: "Birthdays",
    events: "Private Events",
  };
  return {
    title: `${titles[topic] ?? "Host"} · NTG Lounge`,
  };
}

export default async function HostPage({ searchParams }: Props) {
  const { topic = "sponsor" } = await searchParams;
  const offeringType = TOPIC_TO_TYPE[topic];
  if (!offeringType || !serverEnv.databaseUrl) {
    notFound();
  }

  const [offering, sponsorLogos] = await Promise.all([
    getHostOfferingByType(offeringType),
    topic === "sponsor" ? listActiveSponsorLogos() : Promise.resolve([]),
  ]);

  if (!offering || !offering.active) {
    notFound();
  }

  const inquiryTopic = TOPIC_TO_INQUIRY[topic];
  const whatsappHref = whatsappInquiryUrl(hostInquiryWhatsappMessage(inquiryTopic));

  return (
    <main id="main-content" className="relative min-h-screen">
      <div className="mx-auto w-full max-w-4xl px-5 pb-16 pt-32 sm:pt-36">
        <Link
          href="/#plans"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-white/70"
        >
          ← Back to plans
        </Link>

        <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          Host at NTG
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          {offering.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/60">{offering.summary}</p>

        {offering.body ? (
          <p className="mt-6 text-sm leading-relaxed text-white/55">{offering.body}</p>
        ) : null}

        {offering.highlights.length > 0 ? (
          <ul className="mt-8 space-y-2 text-sm text-white/65">
            {offering.highlights.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        {topic === "sponsor" && sponsorLogos.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              Past partners
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {sponsorLogos.map((logo) => {
                const inner = (
                  <div className="relative flex h-24 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <Image
                      src={logo.logoUrl}
                      alt={logo.name}
                      width={160}
                      height={64}
                      className="max-h-14 w-auto object-contain"
                    />
                  </div>
                );
                return logo.websiteUrl ? (
                  <a
                    key={logo.id}
                    href={logo.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-80"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={logo.id}>{inner}</div>
                );
              })}
            </div>
          </div>
        ) : null}

        {(topic === "birthday" || topic === "events") && (
          <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/45">Event photos coming soon.</p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em]"
          >
            {topic === "sponsor" ? "Partner with us" : "Get quote on WhatsApp"}
          </a>
          <Link
            href="/#plans"
            className="glass inline-flex items-center rounded-full px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-white/80"
          >
            View all plans
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap gap-2">
          {Object.keys(TOPIC_TO_TYPE).map((key) => (
            <Link
              key={key}
              href={`/host?topic=${key}`}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                key === topic
                  ? "bg-amber-500 text-black"
                  : "border border-white/15 text-white/55 hover:text-white"
              }`}
            >
              {key === "sponsor" ? "Sponsors" : key === "birthday" ? "Birthdays" : "Events"}
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
