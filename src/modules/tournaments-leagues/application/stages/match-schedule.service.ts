import { MatchScheduleStatus, MatchStatus, Prisma } from "@prisma/client";
import { prisma } from "@core/database/client";
import { recordStageMatchResult } from "./stage-lifecycle.service";

const DEFAULT_RESULT_WINDOW_HOURS = 3;

export type MyGameView = {
  matchId: string;
  stageId: string;
  stageName: string;
  stageOrder: number;
  stageFinishesAt: string | null;
  resultWindowHours: number;
  roundNumber: number;
  positionInRound: number;
  bracketSide: string | null;
  status: string;
  scheduledAt: string | null;
  scheduleStatus: string;
  confirmedBySlot0: boolean;
  confirmedBySlot1: boolean;
  resultDeadlineAt: string | null;
  mySlot: 0 | 1;
  myTeamId: string;
  myTeamName: string;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  iConfirmed: boolean;
  opponentConfirmed: boolean;
  canConfirm: boolean;
  canPropose: boolean;
  canSubmitResult: boolean;
  resultOverdue: boolean;
  result: {
    winnerSlot: number;
    scoreA: number | null;
    scoreB: number | null;
    scoreSummary: string | null;
    screenshotUrl: string | null;
  } | null;
};

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
          stage: { select: { id: true, name: true, order: true, config: true, tournamentId: true } },
          tournament: { select: { id: true, slug: true } },
        },
      },
    },
  });
  if (!match) throw new Error("Match not found.");
  return match;
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
            select: { id: true, name: true, order: true, config: true },
          },
        },
      },
    },
    orderBy: [{ scheduledAt: "asc" }, { roundNumber: "asc" }],
  });

  const now = Date.now();
  const games: MyGameView[] = [];

  for (const m of matches) {
    const mine = userSlotOnMatch(m, teamSet);
    if (!mine) continue;
    const opp = m.participants.find((p) => p.slot !== mine.slot);
    const stage = m.bracket.stage;
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

    games.push({
      matchId: m.id,
      stageId: stage?.id ?? "",
      stageName: stage?.name ?? "Stage",
      stageOrder: stage?.order ?? 0,
      stageFinishesAt: cfg.finishesAt,
      resultWindowHours: cfg.resultWindowHours,
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
      resultOverdue: overdue,
      result: m.result
        ? {
            winnerSlot: m.result.winnerSlot,
            scoreA: m.result.scoreA,
            scoreB: m.result.scoreB,
            scoreSummary: m.result.scoreSummary,
            screenshotUrl: m.result.screenshotUrl,
          }
        : null,
    });
  }

  return { games, hasTeam: true };
}

export async function submitMatchResultWithProof(args: {
  matchId: string;
  userId: string;
  winnerSlot: number;
  scoreA: number;
  scoreB: number;
  screenshotUrl: string;
  adminOverride?: boolean;
}): Promise<{ advancedStage: boolean }> {
  if (args.winnerSlot !== 0 && args.winnerSlot !== 1) {
    throw new Error("winnerSlot must be 0 or 1.");
  }
  if (!Number.isFinite(args.scoreA) || !Number.isFinite(args.scoreB)) {
    throw new Error("Scores are required.");
  }
  if (args.scoreA < 0 || args.scoreB < 0) {
    throw new Error("Scores cannot be negative.");
  }
  if (!args.screenshotUrl?.trim() && !args.adminOverride) {
    throw new Error("Screenshot is required.");
  }

  const match = await loadMatchForSchedule(args.matchId);
  if (match.result) throw new Error("Result already submitted.");
  if (match.status === MatchStatus.BYE) throw new Error("Cannot result a bye.");

  if (!args.adminOverride) {
    const tournamentId =
      match.bracket.stage?.tournamentId ?? match.bracket.tournament?.id;
    if (!tournamentId) throw new Error("Tournament not found for match.");
    const teamIds = new Set(await resolveUserTeamIds(tournamentId, args.userId));
    const mine = userSlotOnMatch(match, teamIds);
    if (!mine) throw new Error("You are not on a team in this match.");

    if (match.scheduleStatus !== MatchScheduleStatus.CONFIRMED) {
      throw new Error("Match time must be confirmed by both teams first.");
    }
    if (match.resultDeadlineAt && match.resultDeadlineAt.getTime() < Date.now()) {
      throw new Error(
        "Result deadline has passed. Ask an admin to record the result.",
      );
    }
  }

  const scoreSummary = `${args.scoreA}-${args.scoreB}`;
  const advanced = await recordStageMatchResult({
    matchId: args.matchId,
    winnerSlot: args.winnerSlot,
    scoreSummary,
  });

  await prisma.matchResult.update({
    where: { matchId: args.matchId },
    data: {
      scoreA: Math.trunc(args.scoreA),
      scoreB: Math.trunc(args.scoreB),
      screenshotUrl: args.screenshotUrl?.trim() || null,
      submittedByUserId: args.userId,
    },
  });

  return advanced;
}
