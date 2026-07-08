import type { RosterPlayerView } from "@core/contracts/roster-listings";
import { CS2_ROSTER_MAX_PLAYERS } from "@/lib/roster-games";
import { CS2_ROSTER_CHARACTER_IMAGES } from "@/lib/cs2-roster-assets";

type Props = {
  players: RosterPlayerView[];
};

function Cs2SlotCard({ player, slotIndex }: { player: RosterPlayerView | null; slotIndex: number }) {
  const charSrc = CS2_ROSTER_CHARACTER_IMAGES[slotIndex];
  const isIGL = player?.roleLabel === "IGL";

  if (!player) {
    return (
      <div className="aspect-[268/640] w-full relative flex flex-col items-center justify-end pb-4 sm:pb-6 gap-1 sm:gap-2 group">
        <img
          src={charSrc}
          alt={`Player ${slotIndex + 1}`}
          fetchPriority="high"
          decoding="async"
          className="absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 h-[calc(100%-3rem)] sm:h-[calc(100%-4rem)] w-auto max-w-none opacity-20 grayscale pointer-events-none select-none transition-transform duration-500 group-hover:scale-105"
          draggable={false}
        />
        <span className="relative z-10 text-white/25 text-[10px] font-bold uppercase tracking-[0.18em]">
          Player {slotIndex + 1}
        </span>
        <span className="relative z-10 text-white/15 text-[9px]">Vacant</span>
      </div>
    );
  }

  const name = player.steamPersonaName ?? player.displayName;

  return (
    <div className="group aspect-[268/640] w-full relative transition-all duration-400 hover:scale-[1.03] hover:-translate-y-1 flex flex-col items-center justify-end pb-4 sm:pb-6">
      <img
        src={charSrc}
        alt={name}
        fetchPriority="high"
        decoding="async"
        className={`absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 h-[calc(100%-3rem)] sm:h-[calc(100%-4rem)] w-auto max-w-none pointer-events-none select-none transition-all duration-500 group-hover:scale-105 ${
          isIGL
            ? "drop-shadow-[0_0_15px_rgba(250,204,21,0.2)] group-hover:drop-shadow-[0_0_25px_rgba(250,204,21,0.7)]"
            : "drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:drop-shadow-[0_0_25px_var(--color-brand)]"
        }`}
        draggable={false}
      />

      <div className="relative z-20 flex flex-col items-center text-center w-full px-2 mt-4">
        <h3 className="font-display text-[10px] sm:text-base font-black text-white leading-tight truncate max-w-full drop-shadow-md">
          {name}
        </h3>

        {player.roleLabel ? (
          <p
            className={`mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] uppercase tracking-[0.18em] font-bold ${
              isIGL
                ? "text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]"
                : "text-[var(--color-brand)]/90"
            }`}
          >
            {player.roleLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function Cs2RosterGrid({ players }: Props) {
  const slots = Array.from({ length: CS2_ROSTER_MAX_PLAYERS }, (_, i) =>
    players.find((p) => p.sortOrder === i) ?? null,
  );

  return (
    <>
      <div
        className="cs2-grid grid gap-3 sm:gap-4"
        style={{
          gridTemplateColumns: `repeat(${CS2_ROSTER_MAX_PLAYERS}, minmax(0, 1fr))`,
        }}
      >
        {slots.map((player, i) => (
          <Cs2SlotCard key={player?.id ?? `slot-${i}`} player={player} slotIndex={i} />
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cs2-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .cs2-grid > :nth-child(5):last-child {
            grid-column: span 2;
            width: calc(50% - 0.375rem);
            margin: 0 auto;
          }
        }
      `}</style>
    </>
  );
}
