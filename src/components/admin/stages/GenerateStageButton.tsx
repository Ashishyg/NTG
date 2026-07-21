"use client";

type Props = {
  busy: boolean;
  runnable: boolean;
  matchCount: number;
  onGenerate: () => void;
  className?: string;
};

export default function GenerateStageButton({
  busy,
  runnable,
  matchCount,
  onGenerate,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      disabled={busy || !runnable}
      onClick={onGenerate}
      className={`w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(16,185,129,0.25)] transition hover:bg-emerald-500 disabled:opacity-40 ${className}`}
    >
      {busy
        ? "Working…"
        : matchCount > 0
          ? `Regenerate Matches (${matchCount})`
          : "Generate Matches"}
    </button>
  );
}
