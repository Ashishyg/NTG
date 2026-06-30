"use client";

import type { RosterPlayerView } from "@core/contracts/roster-listings";
import { rankIconUrl } from "@/lib/valorant-rank";
import { resolvePortraitCardArtUrl } from "@/lib/valorant-player-card";

type Props = {
  player: RosterPlayerView | null;
  slotLabel?: string;
  className?: string;
};

const DEFAULT_CARD =
  "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";

export default function RosterPlayerCard({ player, slotLabel, className = "" }: Props) {
  if (!player) {
    return (
      <div
        className={`aspect-[268/640] w-full rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center gap-2 ${className}`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-white/15">
          <svg className="h-4 w-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="text-white/25 text-[10px] font-bold uppercase tracking-[0.18em]">{slotLabel ?? "Open slot"}</span>
        <span className="text-white/15 text-[9px]">Vacant</span>
      </div>
    );
  }

  const icon = rankIconUrl(player.rankTierId);
  const cardImg = resolvePortraitCardArtUrl(player.riotPlayerCard, player.riotPlayerCardWide) ?? DEFAULT_CARD;
  const roleLabel =
    player.roleLabel ??
    (player.valorantRoles.length > 0 ? player.valorantRoles[0] : null);

  const isIGL = player.roleLabel === "IGL";

  return (
    <div
      className={`group aspect-[268/640] w-full relative transition-all duration-400 hover:scale-[1.03] hover:-translate-y-1 ${className}`}
    >
      <div
        className={`absolute inset-0 rounded-2xl sm:rounded-[2rem] overflow-hidden flex flex-col justify-end shadow-2xl p-2 sm:p-4 ${
          isIGL
            ? "group-hover:shadow-[0_0_40px_rgba(250,204,21,0.25)] ring-2 ring-yellow-500/20 shadow-[0_0_20px_rgba(250,204,21,0.1)]"
            : "group-hover:shadow-[0_0_40px_rgba(94,234,212,0.20)]"
        }`}
      >
        <img
          src={cardImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top pointer-events-none"
        />

        {isIGL && (
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 via-transparent to-yellow-500/10 pointer-events-none mix-blend-overlay" />
        )}

        <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none ${isIGL ? 'from-black via-black/60 to-black/20' : 'from-black via-black/55 to-black/10'}`} />

        <div className={`absolute inset-0 rounded-2xl sm:rounded-[2rem] ring-2 ring-inset ring-white/0 transition-all duration-300 pointer-events-none ${
          isIGL ? 'group-hover:ring-yellow-500/50' : 'group-hover:ring-[var(--color-brand)]/30'
        }`} />

        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none z-10" />

        <div className="relative z-20 flex flex-col items-center text-center w-full pb-1">
          <div className="mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">
            {icon ? (
              <img src={icon} alt="" className="h-10 w-10 sm:h-12 sm:w-12 object-contain drop-shadow-lg" />
            ) : (
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white/10" />
            )}
          </div>

          <h3 className="font-display text-[10px] sm:text-base font-black text-white leading-tight truncate max-w-full drop-shadow-md">
            {player.displayName}
          </h3>

          {roleLabel ? (
            <p className={`mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] uppercase tracking-[0.18em] font-bold ${
              isIGL ? "text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" : "text-[var(--color-brand)]/90"
            }`}>
              {roleLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
