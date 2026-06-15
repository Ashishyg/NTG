import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  label: string;
  title: string;
  description: string;
  accent?: string;
  icon?: ReactNode;
};

export default function PathCard({
  href,
  label,
  title,
  description,
  accent = "var(--color-brand)",
  icon,
}: Props) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[11rem] flex-col justify-between overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-white/[0.025] p-6 transition-all duration-500 hover:border-white/15 hover:bg-white/[0.04]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `color-mix(in srgb, ${accent} 35%, transparent)` }}
      />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">{label}</p>
        {icon ? <div className="mt-4 text-white/70">{icon}</div> : null}
        <p className="mt-3 font-display text-2xl font-semibold text-white">{title}</p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/45">{description}</p>
      <span
        className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors"
        style={{ color: accent }}
      >
        Explore
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}
