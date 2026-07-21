"use client";

import type { ReactNode } from "react";

export type BracketMatchView = {
  id: string;
  roundNumber: number;
  positionInRound: number;
  bracketSide: string | null;
  status: string;
  matchFormat?: string | null;
  isFinal?: boolean;
  scheduledAt?: string | null;
  scheduleStatus?: string | null;
  participants: {
    slot: number;
    teamId: string | null;
    teamLabel: string | null;
  }[];
  result: {
    winnerSlot: number;
    scoreSummary: string | null;
    scoreA?: number | null;
    scoreB?: number | null;
  } | null;
};

export type BracketTeamOption = { id: string; name: string };

type Props = {
  matches: BracketMatchView[];
  matchFormat?: string;
  finalsMatchFormat?: string | null;
  onPickWinner?: (matchId: string, winnerSlot: number) => void;
  onAssignTeam?: (matchId: string, slot: number, team: BracketTeamOption | null) => void;
  teamOptions?: BracketTeamOption[];
  savingMatchIds?: Set<string>;
  accentHex?: string;
  headerSlot?: ReactNode;
};

// ─── Layout constants ────────────────────────────────────────────────────────
const CARD_H   = 74;  // px — two h-[37px] rows + border
const UNIT     = 104; // px — vertical space per first-round slot
const COL_W    = 200; // px — width of each round column
const COL_GAP  = 48;  // px — horizontal gap between columns
const HDR_H    = 50;  // px — height of round label above the cards area
const LINE_CLR = "rgba(255,255,255,0.14)";

// ─── Round label helper ───────────────────────────────────────────────────────
function roundLabel(round: number, totalRounds: number, side: string | null, isFinal: boolean): string {
  if (side === "grand_final") return "Grand Final";
  if (isFinal && side !== "losers") return "Final";
  if (side === "losers") return `LB R${round}`;
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${round}`;
}

// ─── Single match card ────────────────────────────────────────────────────────
function MatchCard({
  m, interactive, saving, canAssign, teamOptions, onPickWinner, onAssignTeam, accentHex,
}: {
  m: BracketMatchView;
  interactive: boolean;
  saving: boolean;
  canAssign: boolean;
  teamOptions: BracketTeamOption[];
  onPickWinner?: (id: string, slot: number) => void;
  onAssignTeam?: (id: string, slot: number, team: BracketTeamOption | null) => void;
  accentHex: string;
}) {
  const a = m.participants.find((p) => p.slot === 0);
  const b = m.participants.find((p) => p.slot === 1);
  const hasResult = m.result != null;
  const scheduleTitle =
    m.scheduledAt != null
      ? `${new Date(m.scheduledAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}${
          m.scheduleStatus && m.scheduleStatus !== "UNSET"
            ? ` · ${m.scheduleStatus.replace(/_/g, " ").toLowerCase()}`
            : ""
        }`
      : undefined;

  return (
    <div
      title={scheduleTitle}
      style={{
        height: CARD_H,
        // Neutral glass border/glow when a result is recorded (removes red outline)
        borderColor: hasResult ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
        boxShadow: hasResult
          ? `0 0 20px -6px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`
          : "inset 0 1px 0 rgba(255,255,255,0.05)",
        // Glassmorphism base
        background: hasResult
          ? `linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.025) 100%)`
          : `linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      className="relative z-[1] w-full overflow-hidden rounded-xl border text-xs"
    >
      {([a, b] as const).map((p, slot) => {
        const won  = m.result?.winnerSlot === slot;
        const lost = hasResult && !won;
        const canPick = interactive && Boolean(p?.teamId) && !saving;
        const isPlaceholder = !p?.teamId && (
          p?.teamLabel === "Winners Final" || p?.teamLabel === "Losers Final" ||
          !p?.teamLabel || p.teamLabel === "TBD"
        );

        const scoreFromFields =
          m.result?.scoreA != null && m.result?.scoreB != null
            ? slot === 0
              ? String(m.result.scoreA)
              : String(m.result.scoreB)
            : null;
        const scoreStr =
          scoreFromFields ??
          m.result?.scoreSummary?.split(/[-–]/)[slot]?.trim();
        const hasScore =
          scoreFromFields != null || m.result?.scoreSummary != null;
        const displayScore = hasScore ? scoreStr : m.result ? (won ? "W" : "L") : null;

        const row = (
          <div
            style={{ height: CARD_H / 2 }}
            className={`flex items-stretch ${slot === 0 ? "border-b border-white/[0.07]" : ""}${
              won ? " bg-white/[0.06]" : ""
            }`}
          >
            <div
              className={`flex min-w-0 flex-1 items-center px-3 ${
                won ? "font-semibold text-emerald-400" : lost ? "text-white/30" : "text-white/60"
              }`}
            >
              <span className="truncate">{p?.teamLabel ?? "TBD"}</span>
            </div>
            {displayScore != null && (
              <div
                className="flex w-8 shrink-0 items-center justify-center border-l border-white/[0.07] text-[11px] font-bold tabular-nums"
                style={{
                  color: won ? "#34d399" : "rgba(255,255,255,0.22)",
                  background: won ? "rgba(52,211,153,0.12)" : "transparent",
                }}
              >
                {displayScore}
              </div>
            )}
          </div>
        );

        if (canPick) {
          return (
            <button key={slot} type="button" onClick={() => onPickWinner?.(m.id, slot)}
              className="w-full text-left hover:bg-white/[0.05] transition-colors">
              {row}
            </button>
          );
        }

        if (canAssign && !m.result && (isPlaceholder || !p?.teamId)) {
          return (
            <div key={slot} className="relative">
              <select
                className="h-[37px] w-full appearance-none border-0 bg-transparent px-3 text-xs text-white/45 outline-none hover:bg-white/[0.04]"
                value={p?.teamId ?? ""} disabled={saving}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) { onAssignTeam?.(m.id, slot, null); return; }
                  const team = teamOptions.find((t) => t.id === id) ?? null;
                  if (team) onAssignTeam?.(m.id, slot, team);
                }}
              >
                <option value="">{p?.teamLabel && !p.teamId ? p.teamLabel : "TBD"}</option>
                {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          );
        }

        return <div key={slot}>{row}</div>;
      })}
    </div>
  );
}

// ─── Single bracket side (winners / losers / grand final) ─────────────────────
function BracketSide({
  matches, totalRounds, matchFormat, finalsMatchFormat, forceGrandFinalLabel,
  onPickWinner, onAssignTeam, teamOptions = [], savingMatchIds, accentHex = "#22d3ee",
}: {
  matches: BracketMatchView[];
  totalRounds: number;
  matchFormat: string;
  finalsMatchFormat?: string | null;
  forceGrandFinalLabel?: boolean;
  onPickWinner?: (id: string, slot: number) => void;
  onAssignTeam?: (id: string, slot: number, team: BracketTeamOption | null) => void;
  teamOptions?: BracketTeamOption[];
  savingMatchIds?: Set<string>;
  accentHex?: string;
}) {
  // Group by round
  const byRound = new Map<number, BracketMatchView[]>();
  for (const m of matches) {
    const list = byRound.get(m.roundNumber) ?? [];
    list.push(m);
    byRound.set(m.roundNumber, list);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  if (rounds.length === 0) return null;

  // First-round slot count determines the total height
  const firstRoundMatches = (byRound.get(rounds[0]!) ?? []).length;
  const totalH = firstRoundMatches * UNIT; // px — shared by all columns

  const interactive = Boolean(onPickWinner);
  const canAssign   = Boolean(onAssignTeam) && teamOptions.length > 0;

  // Total pixel width of the bracket
  const totalW = rounds.length * COL_W + (rounds.length - 1) * COL_GAP;

  return (
    <div style={{ position: "relative", width: totalW, height: HDR_H + totalH, flexShrink: 0 }}>
      {rounds.map((round, ri) => {
        const roundMatches = (byRound.get(round) ?? []).sort((a, b) => a.positionInRound - b.positionInRound);
        const matchCount   = roundMatches.length;
        // How many first-round slots does each match in this round span?
        const slotsPerMatch = firstRoundMatches / matchCount;
        const slotH = slotsPerMatch * UNIT;

        const sample       = roundMatches[0];
        const isFinalRound = forceGrandFinalLabel || sample?.isFinal || sample?.bracketSide === "grand_final" ||
                             (round === totalRounds && sample?.bracketSide !== "losers");
        const label  = forceGrandFinalLabel ? "Grand Final" :
                       roundLabel(round, totalRounds, sample?.bracketSide ?? null, Boolean(isFinalRound));
        const format = (isFinalRound || forceGrandFinalLabel) && finalsMatchFormat
                       ? finalsMatchFormat : sample?.matchFormat ?? matchFormat;

        const colLeft = ri * (COL_W + COL_GAP);
        const hasNextRound = ri < rounds.length - 1;
        // Is next round same count (straight line, no vertical bar pairing)?
        const nextCount = hasNextRound ? (byRound.get(rounds[ri + 1]!) ?? []).length : 0;
        const isStraight = nextCount >= matchCount;

        return (
          <div key={round}>
            {/* ── Round header ── */}
            <div style={{ position: "absolute", left: colLeft, top: 0, width: COL_W, height: HDR_H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", margin: 0 }}>
                {label}
              </p>
              <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", margin: "2px 0 0" }}>
                {format}
              </p>
            </div>

            {/* ── Match cards + connectors ── */}
            {roundMatches.map((m, mi) => {
              const saving    = savingMatchIds?.has(m.id) ?? false;
              // Card vertical center within column
              const cardTop   = HDR_H + mi * slotH + (slotH - CARD_H) / 2;
              const cardCY    = cardTop + CARD_H / 2; // absolute card center Y

              const isTopOfPair = mi % 2 === 0;

              return (
                <div key={m.id}>
                  {/* Card */}
                  <div style={{ position: "absolute", left: colLeft, top: cardTop, width: COL_W }}>
                    <MatchCard
                      m={m} interactive={interactive} saving={saving}
                      canAssign={canAssign} teamOptions={teamOptions}
                      onPickWinner={onPickWinner} onAssignTeam={onAssignTeam}
                      accentHex={accentHex}
                    />
                  </div>

                  {/* ── LEFT connector (← from previous round) ── */}
                  {ri > 0 && (
                    <div style={{
                      position: "absolute",
                      left: colLeft - COL_GAP,
                      top: cardCY - 0.5,
                      width: COL_GAP,
                      height: 1,
                      background: LINE_CLR,
                    }} />
                  )}

                  {/* ── RIGHT horizontal stub (→ to vertical bar) ── */}
                  {hasNextRound && (
                    <div style={{
                      position: "absolute",
                      left: colLeft + COL_W,
                      top: cardCY - 0.5,
                      width: COL_GAP / 2,
                      height: 1,
                      background: LINE_CLR,
                    }} />
                  )}

                  {/* ── RIGHT vertical bar (top of pair only, connects to partner) ── */}
                  {hasNextRound && !isStraight && isTopOfPair && (
                    <div style={{
                      position: "absolute",
                      left: colLeft + COL_W + COL_GAP / 2 - 0.5,
                      top: cardCY,
                      width: 1,
                      height: slotH, // distance from this card's center to partner's center
                      background: LINE_CLR,
                    }} />
                  )}

                  {/* ── RIGHT horizontal bridge from mid-bar to next column (top of pair only) ── */}
                  {hasNextRound && !isStraight && isTopOfPair && (
                    <div style={{
                      position: "absolute",
                      left: colLeft + COL_W + COL_GAP / 2,
                      top: cardCY + slotH / 2 - 0.5, // midpoint of the vertical bar
                      width: COL_GAP / 2,
                      height: 1,
                      background: LINE_CLR,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function NativeEliminationBracket({
  matches, matchFormat = "BO1", finalsMatchFormat,
  onPickWinner, onAssignTeam, teamOptions = [],
  savingMatchIds, accentHex = "#22d3ee", headerSlot,
}: Props) {
  if (matches.length === 0) {
    return <p className="text-sm text-white/30">No bracket matches generated yet.</p>;
  }

  // grand_final is included in the winners block so the layout engine
  // places it as the rightmost column, vertically centred automatically.
  const winners    = matches.filter((m) => m.bracketSide !== "losers");
  const losers     = matches.filter((m) => m.bracketSide === "losers");
  const hasDoubleElim = losers.length > 0;

  const winnersMax = Math.max(...winners.map((m) => m.roundNumber), 1);
  const losersMax  = Math.max(...losers.map((m) => m.roundNumber), 1);

  const shared = { matchFormat, onPickWinner, onAssignTeam, teamOptions, savingMatchIds, accentHex };

  return (
    <div className="space-y-10">
      {headerSlot && <div className="flex flex-wrap gap-2">{headerSlot}</div>}

      {/* ── Winners / single-elim bracket (includes Grand Final column) ── */}
      <div className="space-y-1">
        {hasDoubleElim && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-2">
            Winners Bracket
          </p>
        )}
        <div className="overflow-x-auto pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
          <BracketSide
            {...shared}
            matches={winners.length > 0 ? winners : matches}
            totalRounds={winners.length > 0 ? winnersMax : Math.max(...matches.map((m) => m.roundNumber), 1)}
            finalsMatchFormat={finalsMatchFormat}
          />
        </div>
      </div>

      {/* ── Losers bracket ── */}
      {losers.length > 0 && (
        <div className="space-y-1">
          <div className="h-px bg-white/[0.05]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-2">
            Losers Bracket
          </p>
          <div className="overflow-x-auto pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
            <BracketSide
              {...shared}
              matches={losers}
              totalRounds={losersMax}
              finalsMatchFormat={null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
