import type { RosterPlayerView } from "@core/contracts/roster-listings";
import { VALORANT_ROSTER_MAX_PLAYERS } from "@/lib/roster-games";
import RosterPlayerCard from "./RosterPlayerCard";

type Props = {
  players: RosterPlayerView[];
};

export default function ValorantRosterGrid({ players }: Props) {
  const slots = Array.from({ length: VALORANT_ROSTER_MAX_PLAYERS }, (_, i) =>
    players.find((p) => p.sortOrder === i) ?? null,
  );

  return (
    <>
      <div
        className="valorant-grid grid gap-3 sm:gap-4"
        style={{
          gridTemplateColumns: `repeat(${VALORANT_ROSTER_MAX_PLAYERS}, minmax(0, 1fr))`,
        }}
      >
        {slots.map((player, i) => (
          <RosterPlayerCard
            key={player?.id ?? `slot-${i}`}
            player={player}
            slotLabel={`Player ${i + 1}`}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .valorant-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .valorant-grid > :nth-child(5):last-child {
            grid-column: span 2;
            width: calc(50% - 0.375rem);
            margin: 0 auto;
          }
        }
      `}</style>
    </>
  );
}
