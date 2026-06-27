"use client";

import { motion } from "framer-motion";
import type { GamepassPlanView } from "@lounge-commerce/domain/types";
import { formatInr, getPlanPriceRows, planMetaLines } from "@/lib/gamepass-display";
import { planWhatsappMessage } from "@/lib/inquiry-messages";
import { whatsappInquiryUrl } from "@/lib/env";

export default function PlanCard({ plan }: { plan: GamepassPlanView }) {
  const priceRows = getPlanPriceRows(plan);
  const meta = planMetaLines(plan);
  const message = planWhatsappMessage(
    plan.whatsappMessage,
    `Hi NTG Lounge, I'd like to inquire about ${plan.title}.`,
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-brand)]/30 hover:bg-white/[0.04] hover:shadow-[0_8px_32px_-8px_rgba(52,211,153,0.15)]"
    >
      <div className="absolute inset-x-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-colors duration-500 group-hover:via-[var(--color-brand)]/50" />

      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(52,211,153,0.1) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-white/95 transition-colors group-hover:text-white">
            {plan.title}
          </h3>
          {plan.subtitle &&
          !plan.timeWindowText &&
          !(plan.priceDay != null && plan.priceNight != null) ? (
            <p className="mt-1.5 text-[13px] font-medium tracking-wide text-white/50">
              {plan.subtitle}
            </p>
          ) : null}
        </div>
        {plan.badge ? (
          <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            {plan.badge}
          </span>
        ) : null}
      </div>

      {plan.description ? (
        <p className="relative z-10 mt-4 text-[14px] leading-relaxed text-white/60">{plan.description}</p>
      ) : null}

      {meta.length > 0 ? (
        <ul className="relative z-10 mt-5 space-y-2.5 text-[13px] text-white/55">
          {meta.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <svg
                className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="leading-snug">{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative z-10 mt-auto space-y-4 pt-7">
        {plan.inquiryOnly ? (
          <p className="text-[13px] font-semibold uppercase tracking-widest text-white/40">
            Rates on request
          </p>
        ) : priceRows && priceRows.length > 0 ? (
          <div className="space-y-1">
            {priceRows.map((row) => (
              <div
                key={`${row.amount}-${row.unit}`}
                className={`flex items-baseline gap-1.5 ${row.muted ? "opacity-80" : ""}`}
              >
                <span
                  className={`font-display font-extrabold tracking-tighter text-white ${
                    row.muted ? "text-2xl text-white/75" : "text-3xl"
                  }`}
                >
                  {formatInr(row.amount)}
                </span>
                <span
                  className={`text-[13px] font-medium tracking-wide ${
                    row.muted ? "text-white/35" : "text-white/45"
                  }`}
                >
                  {row.unit}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <a
          href={whatsappInquiryUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/85 transition-all hover:border-[var(--color-brand)]/40 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M12.04 2C6.6 2 2.16 6.43 2.16 11.86c0 1.91.5 3.78 1.45 5.42L2 22l4.86-1.57a9.86 9.86 0 005.18 1.41c5.43 0 9.87-4.43 9.87-9.86A9.83 9.83 0 0012.04 2zm4.65 11.85c-.25-.13-1.5-.74-1.74-.83-.23-.08-.4-.13-.57.13-.17.25-.66.83-.81 1-.15.17-.3.19-.55.06-.25-.13-1.07-.4-2.04-1.27-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.3.38-.45.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.45-.06-.13-.57-1.37-.78-1.87-.21-.5-.42-.43-.57-.43h-.49c-.17 0-.45.06-.69.31-.23.25-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.17 1.81 2.77 4.4 3.88.62.27 1.1.43 1.47.55.62.2 1.18.17 1.62.1.5-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.17-.48-.29z" />
          </svg>
          Inquire
        </a>
      </div>
    </motion.article>
  );
}
