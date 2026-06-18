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
    <header className={`mb-12 ${centered ? "text-center" : ""}`}>
      {eyebrow ? (
        <p className="text-[10px] font-medium uppercase tracking-[0.42em] text-[var(--color-brand)]/85">
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={`font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl ${
          eyebrow ? "mt-4" : ""
        }`}
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className={`mt-4 text-base leading-relaxed text-white/50 sm:text-lg ${
            centered ? "mx-auto max-w-xl" : "max-w-xl"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
