type Props = {
  status: string;
  variant?: "default" | "live" | "open" | "hosted";
};

const styles: Record<NonNullable<Props["variant"]>, string> = {
  default: "bg-white/[0.05] text-white/60 ring-white/10",
  live: "bg-red-500/10 text-red-300 ring-red-500/30",
  open: "bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-[var(--color-brand)]/35",
  hosted: "bg-white/[0.05] text-white/55 ring-white/12",
};

export default function StatusBadge({ status, variant = "default" }: Props) {
  const v =
    variant !== "default"
      ? variant
      : status === "Live" || status === "IN_PROGRESS"
        ? "live"
        : status === "Open" || status === "REGISTRATION_OPEN"
          ? "open"
          : status === "Hosted" || status === "COMPLETED"
            ? "hosted"
            : "default";

  const label =
    status === "REGISTRATION_OPEN"
      ? "Open"
      : status === "IN_PROGRESS"
        ? "Live"
        : status === "COMPLETED"
          ? "Hosted"
          : status === "DRAFT"
            ? "Soon"
            : status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ring-1 ring-inset ${styles[v]}`}
    >
      {(v === "live" || v === "open") && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}
