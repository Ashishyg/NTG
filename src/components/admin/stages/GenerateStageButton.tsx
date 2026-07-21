"use client";

type Props = {
  busy: boolean;
  runnable: boolean;
  matchCount: number;
  onGenerate: () => void;
  progressLabel?: string | null;
  canResume?: boolean;
  onResume?: () => void;
  className?: string;
};

export default function GenerateStageButton({
  busy,
  runnable,
  matchCount,
  onGenerate,
  progressLabel = null,
  canResume = false,
  onResume,
  className = "",
}: Props) {
  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        disabled={busy || !runnable}
        onClick={onGenerate}
        className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(16,185,129,0.25)] transition hover:bg-emerald-500 disabled:opacity-40"
      >
        {busy
          ? progressLabel || "Working…"
          : matchCount > 0
            ? `Regenerate Matches (${matchCount})`
            : "Generate Matches"}
      </button>
      {canResume && onResume && !busy ? (
        <button
          type="button"
          onClick={onResume}
          className="w-full rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-100 transition hover:bg-amber-500/20"
        >
          Resume creating matches
        </button>
      ) : null}
    </div>
  );
}
