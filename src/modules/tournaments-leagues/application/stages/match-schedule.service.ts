import { MatchScheduleStatus, MatchStatus, Prisma } from "@prisma/client";
import { prisma } from "@core/database/client";
import { recordStageMatchResult } from "./stage-lifecycle.service";
import {
  allGamesHaveScreenshots,
  formatLabel,
  isLikelySeriesScore,
  primaryScreenshotFromGames,
  resolveMatchFormat,
  resolveSeriesResult,
  scoreEntryModeForStage,
  type ScoreEntryMode,
  type SeriesGame,
} from "./series-format";
import type { MyGameView } from "./my-games.types";

export type { MyGameView } from "./my-games.types";

const DEFAULT_RESULT_WINDOW_HOURS = 3;

function readStageScheduleConfig(config: unknown): {
  finishesAt: string | null;
  resultWindowHours: number;
} {
  const base =
    config && typeof config === "object" && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {};
  const finishesAt =
    typeof base.finishesAt === "string" && base.finishesAt.trim()
      ? base.finishesAt
      : null;
  const hours = Number(base.resultWindowHours);
  return {
    finishesAt,
    resultWindowHours:
      Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_RESULT_WINDOW_HOURS,
  };
}

export function mergeStageScheduleConfig(
  existing: unknown,
  patch: { finishesAt?: string | null; resultWindowHours?: number | null },
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (patch.finishesAt === null) delete base.finishesAt;
  else if (typeof patch.finishesAt === "string") base.finishesAt = patch.finishesAt;
  if (patch.resultWindowHours === null) delete base.resultWindowHours;
  else if (
    typeof patch.resultWindowHours === "number" &&
    Number.isFinite(patch.resultWindowHours) &&
    patch.resultWindowHours > 0
  ) {
    base.resultWindowHours = patch.resultWindowHours;
  }
  return base;
}

/** Resolve which tournament team IDs the user belongs to for a cup. */
export async function resolveUserTeamIds(
  tournamentId: string,
  userId: string,
): Promise<string[]> {
  const [captainTeams, coTeams, playerRows, regs] = await Promise.all([
    prisma.tournamentTeam.findMany({
      where: { tournamentId, captainUserId: userId },
      select: { id: true },
    }),
    prisma.tournamentTeam.findMany({
      where: { tournamentId, coCaptainUserId: userId },
      select: { id: true },
    }),
    prisma.tournamentTeamPlayer.findMany({
      where: { userId, team: { tournamentId } },
      select: { teamId: true },
    }),
    prisma.tournamentRegistration.findMany({
      where: { tournamentId, userId, teamId: { not: null } },
      select: { teamId: true },
    }),
  ]);

  const ids = new Set<string>();
  for (const t of captainTeams) ids.add(t.id);
  for (const t of coTeams) ids.add(t.id);
  for (const p of playerRows) ids.add(p.teamId);
  for (const r of regs) if (r.teamId) ids.add(r.teamId);
  return [...ids];
}

async function loadMatchForSchedule(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      participants: { orderBy: { slot: "asc" } },
      result: true,
      bracket: {
        include: {
          stage: {
            select: {
              id: true,
              name: true,
              order: true,
              config: true,
              tournamentId: true,
              matchFormat: true,
              stageType: true,
            },
          },
          tournament: { select: { id: true, slug: true } },
          matches: {
            select: {
              roundNumber: true,
              bracketSide: true,
            },
          },
        },
      },
    },
  });
  if (!match) throw new Error("Match not found.");
  return match;
}

function winnersMaxRoundFromMatches(
  matches: { roundNumber: number; bracketSide: string | null }[],
): number {
  let max = 0;
  for (const m of matches) {
    if (m.bracketSide === "losers" || m.bracketSide === "grand_final") continue;
    if (m.roundNumber > max) max = m.roundNumber;
  }
  return max;
}

function userSlotOnMatch(
  match: {
    participants: { slot: number; tournamentTeamId: string | null }[];
  },
  teamIds: Set<string>,
): { slot: 0 | 1; teamId: string } | null {
  for (const p of match.participants) {
    if (p.tournamentTeamId && teamIds.has(p.tournamentTeamId) && (p.slot === 0 || p.slot === 1)) {
      return { slot: p.slot as 0 | 1, teamId: p.tournamentTeamId };
    }
  }
  return null;
}

function computeDeadline(scheduledAt: Date, windowHours: number): Date {
  return new Date(scheduledAt.getTime() + windowHours * 60 * 60 * 1000);
}

export async function adminSetMatchSchedule(
  matchId: string,
  scheduledAt: Date,
  options?: { forceConfirm?: boolean },
): Promise<void> {
  const match = await loadMatchForSchedule(matchId);
  const stage = match.bracket.stage;
  const { resultWindowHours } = readStageScheduleConfig(stage?.config);

  const force = Boolean(options?.forceConfirm);
  await prisma.match.update({
    where: { id: matchId },
    data: {
      scheduledAt,
      scheduleStatus: force
        ? MatchScheduleStatus.CONFIRMED
        : MatchScheduleStatus.PENDING_CONFIRM,
      confirmedBySlot0: force,
      confirmedBySlot1: force,
      scheduleProposedByTeamId: null,
      resultDeadlineAt: force ? computeDeadline(scheduledAt, resultWindowHours) : null,
    },
  });
}

export async function updateStageScheduleSettings(
  stageId: string,
  patch: { finishesAt?: string | null; resultWindowHours?: number | null },
): Promise<void> {
  const stage = await prisma.tournamentStage.findUnique({ where: { id: stageId } });
  if (!stage) throw new Error("Stage not found.");
  await prisma.tournamentStage.update({
    where: { id: stageId },
    data: {
      config: mergeStageScheduleConfig(stage.config, patch) as Prisma.InputJsonValue,
    },
  });
}

export async function confirmMatchSchedule(
  matchId: string,
  userId: string,
): Promise<void> {
  const match = await loadMatchForSchedule(matchId);
  if (!match.scheduledAt) throw new Error("No schedule set yet.");
  if (match.result) throw new Error("Match already has a result.");

  const tournamentId =
    match.bracket.stage?.tournamentId ?? match.bracket.tournament?.id;
  if (!tournamentId) throw new Error("Tournament not found for match.");

  const teamIds = new Set(await resolveUserTeamIds(tournamentId, userId));
  const mine = userSlotOnMatch(match, teamIds);
  if (!mine) throw new Error("You are not on a team in this match.");

  const data: Prisma.MatchUpdateInput = {};
  if (mine.slot === 0) data.confirmedBySlot0 = true;
  else data.confirmedBySlot1 = true;

  const both =
    (mine.slot === 0 ? true : match.confirmedBySlot0) &&
    (mine.slot === 1 ? true : match.confirmedBySlot1);

  if (both) {
    const { resultWindowHours } = readStageScheduleConfig(
      match.bracket.stage?.config,
    );
    data.scheduleStatus = MatchScheduleStatus.CONFIRMED;
    data.resultDeadlineAt = computeDeadline(match.scheduledAt, resultWindowHours);
  } else {
    data.scheduleStatus = MatchScheduleStatus.PENDING_CONFIRM;
  }

  await prisma.match.update({ where: { id: matchId }, data });
}

export async function proposeMatchSchedule(
  matchId: string,
  userId: string,
  scheduledAt: Date,
): Promise<void> {
  const match = await loadMatchForSchedule(matchId);
  if (match.result) throw new Error("Match already has a result.");

  const tournamentId =
    match.bracket.stage?.tournamentId ?? match.bracket.tournament?.id;
  if (!tournamentId) throw new Error("Tournament not found for match.");

  const teamIds = new Set(await resolveUserTeamIds(tournamentId, userId));
  const mine = userSlotOnMatch(match, teamIds);
  if (!mine) throw new Error("You are not on a team in this match.");

  await prisma.match.update({
    where: { id: matchId },
    data: {
      scheduledAt,
      scheduleStatus: MatchScheduleStatus.PENDING_CONFIRM,
      scheduleProposedByTeamId: mine.teamId,
      confirmedBySlot0: mine.slot === 0,
      confirmedBySlot1: mine.slot === 1,
      resultDeadlineAt: null,
    },
  });
}

export async function listMyGames(
  slug: string,
  userId: string,
): Promise<{ games: MyGameView[]; hasTeam: boolean }> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tournament) throw new Error("Tournament not found.");

  const myTeamIds = await resolveUserTeamIds(tournament.id, userId);
  if (myTeamIds.length === 0) {
    return { games: [], hasTeam: false };
  }
  const teamSet = new Set(myTeamIds);

  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { bracket: { stage: { tournamentId: tournament.id } } },
        { bracket: { tournamentId: tournament.id } },
      ],
      participants: {
        some: { tournamentTeamId: { in: myTeamIds } },
      },
      status: { not: MatchStatus.BYE },
    },
    include: {
      participants: {
        orderBy: { slot: "asc" },
        include: { tournamentTeam: { select: { id: true, name: true } } },
      },
      result: true,
      bracket: {
        include: {
          stage: {
            select: {
              id: true,
              name: true,
              order: true,
              config: true,
              status: true,
              matchFormat: true,
              stageType: true,
            },
          },
          matches: {
            select: {
              roundNumber: true,
              bracketSide: true,
            },
          },
        },
      },
    },
    orderBy: [{ scheduledAt: "asc" }, { roundNumber: "asc" }],
  });

  // Hide later-stage games until the previous stage is complete.
  const allStages = await prisma.tournamentStage.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { order: "asc" },
    select: { id: true, order: true, status: true },
  });
  const stageRevealed = (order: number) => {
    const previous = [...allStages]
      .filter((s) => s.order < order)
      .sort((a, b) => b.order - a.order)[0];
    return !previous || previous.status === "COMPLETE";
  };

  const now = Date.now();
  const games: MyGameView[] = [];

  for (const m of matches) {
    const stage = m.bracket.stage;
    if (stage) {
      if (!stageRevealed(stage.order)) continue;
    }
    // Submitted results leave Your Games — only open / reset matches stay.
    // Admin edits happen in the stage builder; players re-submit after a reset.
    if (m.result) continue;

    const mine = userSlotOnMatch(m, teamSet);
    if (!mine) continue;
    const opp = m.participants.find((p) => p.slot !== mine.slot);
    const cfg = readStageScheduleConfig(stage?.config);
    const iConfirmed =
      mine.slot === 0 ? m.confirmedBySlot0 : m.confirmedBySlot1;
    const opponentConfirmed =
      mine.slot === 0 ? m.confirmedBySlot1 : m.confirmedBySlot0;
    const hasResult = Boolean(m.result);
    const confirmed = m.scheduleStatus === MatchScheduleStatus.CONFIRMED;
    const overdue =
      confirmed &&
      !hasResult &&
      m.resultDeadlineAt != null &&
      m.resultDeadlineAt.getTime() < now;

    const winnersMax = winnersMaxRoundFromMatches(m.bracket.matches ?? []);
    const matchFormat = resolveMatchFormat({
      stageMatchFormat: stage?.matchFormat,
      config: stage?.config,
      bracketSide: m.bracketSide,
      nextWinnerMatchId: m.nextWinnerMatchId,
      roundNumber: m.roundNumber,
      winnersMaxRound: winnersMax,
    });
    const scoreEntryMode = scoreEntryModeForStage(stage?.stageType);

    games.push({
      matchId: m.id,
      stageId: stage?.id ?? "",
      stageName: stage?.name ?? "Stage",
      stageOrder: stage?.order ?? 0,
      stageFinishesAt: cfg.finishesAt,
      resultWindowHours: cfg.resultWindowHours,
      stageType: stage?.stageType ?? null,
      scoreEntryMode,
      matchFormat,
      formatLabel:
        scoreEntryMode === "rounds" ? "Round scores" : formatLabel(matchFormat),
      roundNumber: m.roundNumber,
      positionInRound: m.positionInRound,
      bracketSide: m.bracketSide,
      status: m.status,
      scheduledAt: m.scheduledAt?.toISOString() ?? null,
      scheduleStatus: m.scheduleStatus,
      confirmedBySlot0: m.confirmedBySlot0,
      confirmedBySlot1: m.confirmedBySlot1,
      resultDeadlineAt: m.resultDeadlineAt?.toISOString() ?? null,
      mySlot: mine.slot,
      myTeamId: mine.teamId,
      myTeamName:
        m.participants.find((p) => p.slot === mine.slot)?.tournamentTeam?.name ??
        m.participants.find((p) => p.slot === mine.slot)?.teamLabel ??
        "Your team",
      opponentTeamId: opp?.tournamentTeamId ?? null,
      opponentTeamName:
        opp?.tournamentTeam?.name ?? opp?.teamLabel ?? "TBD",
      iConfirmed,
      opponentConfirmed,
      canConfirm:
        !hasResult &&
        Boolean(m.scheduledAt) &&
        m.scheduleStatus !== MatchScheduleStatus.CONFIRMED &&
        !iConfirmed,
      canPropose: !hasResult && m.status !== MatchStatus.COMPLETED,
      canSubmitResult:
        !hasResult &&
        confirmed &&
        Boolean(m.scheduledAt) &&
        (!m.resultDeadlineAt || m.resultDeadlineAt.getTime() >= now),
      canEditResult: false,
      resultOverdue: overdue,
      result: null,
    });
  }

  return { games, hasTeam: true };
}

export async function submitMatchResultWithProof(args: {
  matchId: string;
  userId: string;
  winnerSlot?: number;
  scoreA?: number;
  scoreB?: number;
  games?: SeriesGame[];
  /** Top-level proof; derived from per-game screenshots when omitted. */
  screenshotUrl?: string;
  adminOverride?: boolean;
}): Promise<{ advancedStage: boolean }> {
  const match = await loadMatchForSchedule(args.matchId);
  if (match.status === MatchStatus.BYE) throw new Error("Cannot result a bye.");

  const stage = match.bracket.stage;
  const scoreEntryMode: ScoreEntryMode = scoreEntryModeForStage(stage?.stageType);
  const winnersMax = winnersMaxRoundFromMatches(match.bracket.matches ?? []);
  const matchFormat = resolveMatchFormat({
    stageMatchFormat: stage?.matchFormat,
    config: stage?.config,
    bracketSide: match.bracketSide,
    nextWinnerMatchId: match.nextWinnerMatchId,
    roundNumber: match.roundNumber,
    winnersMaxRound: winnersMax,
  });

  let scoreA: number;
  let scoreB: number;
  let winnerSlot: number;
  let games: SeriesGame[] | undefined = args.games;

  const useRounds =
    scoreEntryMode === "rounds" &&
    (!games || games.length === 0) &&
    (args.adminOverride ||
      (typeof args.scoreA === "number" && typeof args.scoreB === "number"));

  if (games && games.length > 0 && scoreEntryMode === "series") {
    const resolved = resolveSeriesResult(matchFormat, games);
    scoreA = resolved.scoreA;
    scoreB = resolved.scoreB;
    winnerSlot = resolved.winnerSlot;
    games = games.map((g) => ({
      winnerSlot: g.winnerSlot,
      scoreA: g.scoreA ?? null,
      scoreB: g.scoreB ?? null,
      screenshotUrl: g.screenshotUrl?.trim() || null,
    }));
  } else if (useRounds || (args.adminOverride && (!games || games.length === 0))) {
    // Round Robin / standings: store literal round (or goal) scores as-is.
    if (args.winnerSlot !== 0 && args.winnerSlot !== 1) {
      throw new Error("winnerSlot must be 0 or 1.");
    }
    if (!Number.isFinite(args.scoreA) || !Number.isFinite(args.scoreB)) {
      throw new Error("Scores are required.");
    }
    if ((args.scoreA as number) < 0 || (args.scoreB as number) < 0) {
      throw new Error("Scores cannot be negative.");
    }
    scoreA = Math.trunc(args.scoreA as number);
    scoreB = Math.trunc(args.scoreB as number);
    winnerSlot = args.winnerSlot as 0 | 1;
    const winnerScore = winnerSlot === 0 ? scoreA : scoreB;
    const loserScore = winnerSlot === 0 ? scoreB : scoreA;
    if (winnerScore <= loserScore) {
      throw new Error("Winning team score must be higher than the losing team.");
    }
    games = [];
  } else if (games && games.length > 0) {
    // Non-elim stage accidentally sent games — treat as series only if totals look like maps.
    const resolved = resolveSeriesResult(matchFormat, games);
    scoreA = resolved.scoreA;
    scoreB = resolved.scoreB;
    winnerSlot = resolved.winnerSlot;
    games = games.map((g) => ({
      winnerSlot: g.winnerSlot,
      scoreA: g.scoreA ?? null,
      scoreB: g.scoreB ?? null,
      screenshotUrl: g.screenshotUrl?.trim() || null,
    }));
  } else {
    if (args.winnerSlot !== 0 && args.winnerSlot !== 1) {
      throw new Error("winnerSlot must be 0 or 1.");
    }
    if (!Number.isFinite(args.scoreA) || !Number.isFinite(args.scoreB)) {
      throw new Error("Scores are required.");
    }
    if ((args.scoreA as number) < 0 || (args.scoreB as number) < 0) {
      throw new Error("Scores cannot be negative.");
    }
    const a = Math.trunc(args.scoreA as number);
    const b = Math.trunc(args.scoreB as number);
    const w = args.winnerSlot as 0 | 1;

    // Literal round scores on series stages (shouldn't happen for players) —
    // only synthesize BO games when totals look like map wins.
    if (!isLikelySeriesScore(a, b)) {
      throw new Error(
        "Enter a best-of series result (game winners), not round totals.",
      );
    }

    const synthetic: SeriesGame[] = [];
    const loserSlot = (w === 0 ? 1 : 0) as 0 | 1;
    const loserScore = w === 0 ? b : a;
    const winnerScore = w === 0 ? a : b;
    const sharedShot = args.screenshotUrl?.trim() || null;
    for (let i = 0; i < loserScore; i++) {
      synthetic.push({ winnerSlot: loserSlot, screenshotUrl: sharedShot });
    }
    for (let i = 0; i < winnerScore; i++) {
      synthetic.push({ winnerSlot: w, screenshotUrl: sharedShot });
    }
    const resolved = resolveSeriesResult(matchFormat, synthetic);
    scoreA = resolved.scoreA;
    scoreB = resolved.scoreB;
    winnerSlot = resolved.winnerSlot;
    games = synthetic;
  }

  const primaryShot =
    args.screenshotUrl?.trim() ||
    (games && games.length > 0
      ? primaryScreenshotFromGames(games)
      : null) ||
    null;

  if (!args.adminOverride) {
    if (scoreEntryMode === "rounds") {
      if (!primaryShot) {
        throw new Error("Screenshot is required.");
      }
    } else {
      if (!games || !allGamesHaveScreenshots(games)) {
        throw new Error("Upload a screenshot for each game.");
      }
      if (!primaryShot) {
        throw new Error("Screenshot is required.");
      }
    }
  }

  if (!args.adminOverride) {
    const tournamentId =
      stage?.tournamentId ?? match.bracket.tournament?.id;
    if (!tournamentId) throw new Error("Tournament not found for match.");
    const teamIds = new Set(await resolveUserTeamIds(tournamentId, args.userId));
    const mine = userSlotOnMatch(match, teamIds);
    if (!mine) throw new Error("You are not on a team in this match.");

    if (match.scheduleStatus !== MatchScheduleStatus.CONFIRMED && !match.result) {
      throw new Error("Match time must be confirmed by both teams first.");
    }
    // No player edits after submit — deadline only gates first submission.
    if (match.result) {
      throw new Error(
        "Result already submitted. Ask an admin to reset if it needs changing.",
      );
    }
    if (
      match.resultDeadlineAt &&
      match.resultDeadlineAt.getTime() < Date.now()
    ) {
      throw new Error(
        "Result deadline has passed. Ask an admin to record the result.",
      );
    }
  }

  const scoreSummary = `${scoreA}-${scoreB}`;
  const advanced = await recordStageMatchResult({
    matchId: args.matchId,
    winnerSlot,
    scoreSummary,
    scoreA,
    scoreB,
    games,
  });

  await prisma.matchResult.update({
    where: { matchId: args.matchId },
    data: {
      screenshotUrl: primaryShot,
      submittedByUserId: args.userId,
    },
  });

  return advanced;
}
