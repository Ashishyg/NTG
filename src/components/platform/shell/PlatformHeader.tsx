import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  align?: "left" | "center";
};

export default function PlatformHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: Props) {
  const centered = align === "center";

  return (
    <header className={`mb-12 ${centered ? "text-center flex flex-col items-center" : ""}`}>
      {eyebrow ? (
        <div className={`flex items-center gap-3 mb-4 ${centered ? "justify-center" : ""}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shadow-[0_0_8px_rgba(94,234,212,0.8)]"></span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-brand)]/90">
            {eyebrow}
          </p>
        </div>
      ) : null}
      <h1
        className="font-display text-4xl font-bold tracking-[-0.01em] sm:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 pb-1"
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className={`mt-5 text-base leading-relaxed text-white/50 sm:text-lg ${
            centered ? "mx-auto max-w-xl" : "max-w-xl"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
