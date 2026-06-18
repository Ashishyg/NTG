import type { TournamentPlacementView } from "@core/contracts";

const roleConfig: Record<string, { label: string; accent: string; size: string }> = {
  CHAMPION: { label: "Champion", accent: "var(--color-gold)", size: "lg" },
  RUNNER_UP: { label: "Runner-up", accent: "#c0c0c0", size: "md" },
  MVP: { label: "MVP", accent: "var(--color-brand)", size: "md" },
  THIRD: { label: "3rd", accent: "#cd7f32", size: "sm" },
};

type Props = {
  placements: TournamentPlacementView[];
};

export default function ResultsPodium({ placements }: Props) {
  const ordered = ["CHAMPION", "RUNNER_UP", "MVP", "THIRD"]
    .map((role) => placements.find((p) => p.role === role))
    .filter(Boolean) as TournamentPlacementView[];

  if (ordered.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ordered.map((p) => {
        const cfg = roleConfig[p.role] ?? { label: p.role, accent: "white", size: "sm" };
        const isChamp = p.role === "CHAMPION";
        return (
          <div
            key={p.role}
            className={`relative overflow-hidden rounded-[1.25rem] border border-white/[0.08] p-5 ${
              isChamp ? "sm:col-span-2 sm:p-7" : "bg-white/[0.02]"
            }`}
            style={
              isChamp
                ? {
                    background: `linear-gradient(135deg, color-mix(in srgb, ${cfg.accent} 12%, transparent), transparent 55%)`,
                  }
                : undefined
            }
          >
            <p
              className="text-[10px] font-medium uppercase tracking-[0.32em]"
              style={{ color: cfg.accent }}
            >
              {cfg.label}
            </p>
            <p
              className={`mt-2 font-display font-semibold text-white ${
                isChamp ? "text-3xl sm:text-4xl" : "text-xl"
              }`}
            >
              {p.displayName}
            </p>
          </div>
        );
      })}
    </div>
  );
}
