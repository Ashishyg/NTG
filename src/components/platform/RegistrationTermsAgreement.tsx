"use client";

import Link from "next/link";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  rulebookUrl?: string | null;
  eventType?: "cup" | "tryout";
  disabled?: boolean;
};

export default function RegistrationTermsAgreement({
  checked,
  onChange,
  rulebookUrl,
  eventType = "cup",
  disabled,
}: Props) {
  const eventLabel = eventType === "tryout" ? "tryout" : "cup";
  const fallbackRules =
    eventType === "tryout"
      ? "any tryout rules published by the organizer"
      : "any cup rules published by the organizer";

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-white/65">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-[var(--color-brand)]"
      />
      <span>
        I agree to all NTG{" "}
        <Link href="/privacy" target="_blank" className="text-[var(--color-brand)] hover:underline">
          rules and policy
        </Link>
        {rulebookUrl ? (
          <>
            {" "}
            and this {eventLabel}&apos;s{" "}
            <a
              href={rulebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-brand)] hover:underline"
            >
              rulebook
            </a>
          </>
        ) : (
          <> and {fallbackRules}</>
        )}
        .
      </span>
    </label>
  );
}
