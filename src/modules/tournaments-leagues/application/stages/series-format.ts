/** Best-of series helpers (BO1 / BO3 / BO5). */

export type SeriesFormat = "BO1" | "BO3" | "BO5";

/** Elimination = BO series; Round Robin / Swiss / etc. = literal round scores. */
export type ScoreEntryMode = "series" | "rounds";

/** One game in a best-of series (player / admin result payload). */
export type SeriesGame = {
  winnerSlot: 0 | 1;
  scoreA?: number | null;
  scoreB?: number | null;
  /** Per-game proof screenshot (required on player submit). */
  screenshotUrl?: string | null;
};

/** Wins needed to take the series. */
export function winsNeeded(format: SeriesFormat | string | null | undefined): number {
  if (format === "BO5") return 3;
  if (format === "BO3") return 2;
  return 1;
}

export function maxGames(format: SeriesFormat | string | null | undefined): number {
  if (format === "BO5") return 5;
  if (format === "BO3") return 3;
  return 1;
}

export function isSeriesFormat(v: unknown): v is SeriesFormat {
  return v === "BO1" || v === "BO3" || v === "BO5";
}

export function isEliminationStageType(
  stageType: string | null | undefined,
): boolean {
  return (
    stageType === "SINGLE_ELIMINATION" || stageType === "DOUBLE_ELIMINATION"
  );
}

export function scoreEntryModeForStage(
  stageType: string | null | undefined,
): ScoreEntryMode {
  return isEliminationStageType(stageType) ? "series" : "rounds";
}

export function readFinalsFormat(config: unknown): SeriesFormat | null {
  if (config && typeof config === "object" && "finalsMatchFormat" in config) {
    const v = (config as { finalsMatchFormat?: string }).finalsMatchFormat;
    if (isSeriesFormat(v)) return v;
  }
  return null;
}

/**
 * Resolve BO format for a match (shared by admin, Your Games, public brackets).
 * Finals format applies to: grand final, winners-bracket / SE final round, and
 * true terminal matches when winnersMaxRound is unavailable.
 */
export function resolveMatchFormat(args: {
  stageMatchFormat: string | null | undefined;
  config: unknown;
  bracketSide: string | null | undefined;
  nextWinnerMatchId: string | null | undefined;
  roundNumber?: number | null;
  /** Max round among non-losers / non-GF matches in the same stage. */
  winnersMaxRound?: number | null;
}): SeriesFormat {
  const base = isSeriesFormat(args.stageMatchFormat)
    ? args.stageMatchFormat
    : "BO1";
  const finals = readFinalsFormat(args.config);
  if (!finals) return base;

  if (args.bracketSide === "grand_final") return finals;

  const onWinnersSide =
    args.bracketSide !== "losers" && args.bracketSide !== "grand_final";

  // Prefer round-number detection when available (covers DE WB→GF wiring and
  // admin graphs that omit nextWinnerMatchId).
  if (
    onWinnersSide &&
    typeof args.winnersMaxRound === "number" &&
    args.winnersMaxRound > 0 &&
    typeof args.roundNumber === "number" &&
    args.roundNumber === args.winnersMaxRound
  ) {
    return finals;
  }

  // Fallback when we only know "no further winner slot" (and no round map).
  if (
    args.winnersMaxRound == null &&
    !args.nextWinnerMatchId &&
    args.bracketSide !== "losers"
  ) {
    return finals;
  }

  return base;
}

/** True when aggregate scores look like map wins (1–0, 2–1…) not round scores (13–7). */
export function isLikelySeriesScore(scoreA: number, scoreB: number): boolean {
  return (
    Number.isFinite(scoreA) &&
    Number.isFinite(scoreB) &&
    scoreA + scoreB <= 5 &&
    scoreA >= 0 &&
    scoreB >= 0 &&
    (scoreA === 0 || scoreB === 0 || scoreA !== scoreB)
  );
}

/**
 * Validate a completed series for the given format.
 * Games may stop early (e.g. BO3 ends 2-0 after two games).
 */
export function resolveSeriesResult(
  format: SeriesFormat | string | null | undefined,
  games: SeriesGame[],
): { scoreA: number; scoreB: number; winnerSlot: 0 | 1 } {
  const need = winsNeeded(format);
  const max = maxGames(format);

  if (!Array.isArray(games) || games.length === 0) {
    throw new Error("Record at least one game result.");
  }
  if (games.length > max) {
    throw new Error(`Too many games for ${format ?? "BO1"} (max ${max}).`);
  }

  let scoreA = 0;
  let scoreB = 0;
  let decidedAt = -1;

  for (let i = 0; i < games.length; i++) {
    const g = games[i]!;
    if (g.winnerSlot !== 0 && g.winnerSlot !== 1) {
      throw new Error(`Game ${i + 1}: pick a winner.`);
    }
    if (decidedAt >= 0) {
      throw new Error("Extra games after the series was already decided.");
    }
    if (g.winnerSlot === 0) scoreA += 1;
    else scoreB += 1;
    if (scoreA >= need || scoreB >= need) {
      decidedAt = i;
    }
  }

  if (scoreA < need && scoreB < need) {
    throw new Error(
      `Series incomplete — first to ${need} wins (${format ?? "BO1"}).`,
    );
  }
  if (decidedAt !== games.length - 1) {
    throw new Error("Remove games played after the series was decided.");
  }

  const winnerSlot: 0 | 1 = scoreA > scoreB ? 0 : 1;
  return { scoreA, scoreB, winnerSlot };
}

/**
 * Build a plausible game list from aggregate series scores when editing an old result.
 * Refuses large totals (e.g. 13–7 round scores) so Round Robin edits don't explode into fake games.
 */
export function gamesFromScores(
  scoreA: number,
  scoreB: number,
  winnerSlot: 0 | 1,
): SeriesGame[] {
  if (!isLikelySeriesScore(scoreA, scoreB)) return [];
  const loserSlot = (winnerSlot === 0 ? 1 : 0) as 0 | 1;
  const loserScore = winnerSlot === 0 ? scoreB : scoreA;
  const winnerScore = winnerSlot === 0 ? scoreA : scoreB;
  const games: SeriesGame[] = [];
  for (let i = 0; i < loserScore; i++) games.push({ winnerSlot: loserSlot });
  for (let i = 0; i < winnerScore; i++) games.push({ winnerSlot });
  return games;
}

export function formatLabel(format: SeriesFormat | string | null | undefined): string {
  if (format === "BO5") return "Best of 5 (first to 3)";
  if (format === "BO3") return "Best of 3 (first to 2)";
  return "Best of 1";
}

export function parseStoredGames(raw: unknown): SeriesGame[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: SeriesGame[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const rec = item as {
      winnerSlot?: unknown;
      scoreA?: unknown;
      scoreB?: unknown;
      screenshotUrl?: unknown;
    };
    const slot = rec.winnerSlot;
    if (slot !== 0 && slot !== 1) return null;
    const shot =
      typeof rec.screenshotUrl === "string" && rec.screenshotUrl.trim()
        ? rec.screenshotUrl.trim()
        : null;
    const sa = typeof rec.scoreA === "number" ? rec.scoreA : null;
    const sb = typeof rec.scoreB === "number" ? rec.scoreB : null;
    out.push({ winnerSlot: slot, scoreA: sa, scoreB: sb, screenshotUrl: shot });
  }
  return out;
}

/** True when every listed game has a non-empty screenshot URL. */
export function allGamesHaveScreenshots(games: SeriesGame[]): boolean {
  return games.length > 0 && games.every((g) => Boolean(g.screenshotUrl?.trim()));
}

/** Prefer the last game's proof, then any earlier game, for top-level MatchResult.screenshotUrl. */
export function primaryScreenshotFromGames(games: SeriesGame[]): string | null {
  for (let i = games.length - 1; i >= 0; i--) {
    const shot = games[i]?.screenshotUrl?.trim();
    if (shot) return shot;
  }
  return null;
}
