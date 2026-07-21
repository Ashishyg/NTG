import { MatchStatus, ParticipantType, Prisma } from "@prisma/client";
import { prisma } from "@core/database/client";
import { generateMatchesForStage, placeTeamInMatch } from "./match-generation.engine";
import {
  applyStageMovement,
  isStageMatchesComplete,
  undoStageMovement,
} from "./movement.engine";
import { LeaderboardRepository } from "@tournaments-leagues/infrastructure/leaderboard.repository";

const leaderboardRepo = new LeaderboardRepository();

export async function generateStage(stageId: string) {
  return generateMatchesForStage(stageId);
}

export async function advanceStage(stageId: string) {
  return applyStageMovement(stageId);
}

async function clearTeamFromNextMatch(
  nextMatchId: string | null,
  teamId: string | null | undefined,
): Promise<void> {
  if (!nextMatchId || !teamId) return;
  const next = await prisma.match.findUnique({
    where: { id: nextMatchId },
    select: { result: { select: { id: true } } },
  });
  // Don't tear down a decided downstream match.
  if (next?.result) return;
  await prisma.matchParticipant.updateMany({
    where: { matchId: nextMatchId, tournamentTeamId: teamId },
    data: { tournamentTeamId: null, teamLabel: null },
  });
}

/**
 * Record a match result and advance winners/losers into next matches.
 * When the whole stage completes, run qualification + movement.
 */
export async function recordStageMatchResult(args: {
  matchId: string;
  winnerSlot: number;
  scoreSummary?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  games?: { winnerSlot: number }[] | null;
}): Promise<{ advancedStage: boolean }> {
  const match = await prisma.match.findUnique({
    where: { id: args.matchId },
    include: {
      participants: true,
      bracket: { select: { stageId: true, id: true } },
      result: true,
    },
  });

  if (!match) throw new Error("Match not found.");
  if (args.winnerSlot !== 0 && args.winnerSlot !== 1) {
    throw new Error("winnerSlot must be 0 or 1.");
  }

  const scoreA =
    typeof args.scoreA === "number" && Number.isFinite(args.scoreA)
      ? Math.trunc(args.scoreA)
      : null;
  const scoreB =
    typeof args.scoreB === "number" && Number.isFinite(args.scoreB)
      ? Math.trunc(args.scoreB)
      : null;
  const scoreSummary =
    args.scoreSummary?.trim() ||
    (scoreA != null && scoreB != null ? `${scoreA}-${scoreB}` : null);
  const gamesJson =
    args.games != null
      ? (args.games as Prisma.InputJsonValue)
      : undefined;

  // Editing an existing result: pull the old winner/loser out of later slots first.
  if (match.result) {
    const prevWinner = match.participants.find(
      (p) => p.slot === match.result!.winnerSlot,
    );
    const prevLoser = match.participants.find(
      (p) => p.slot !== match.result!.winnerSlot,
    );
    await clearTeamFromNextMatch(
      match.nextWinnerMatchId,
      prevWinner?.tournamentTeamId,
    );
    await clearTeamFromNextMatch(
      match.nextLoserMatchId,
      prevLoser?.tournamentTeamId,
    );
  }

  await prisma.matchResult.upsert({
    where: { matchId: args.matchId },
    create: {
      matchId: args.matchId,
      winnerSlot: args.winnerSlot,
      scoreSummary,
      scoreA,
      scoreB,
      ...(gamesJson !== undefined
        ? ({ games: gamesJson } as { games: Prisma.InputJsonValue })
        : {}),
    },
    update: {
      winnerSlot: args.winnerSlot,
      scoreSummary,
      scoreA,
      scoreB,
      ...(gamesJson !== undefined
        ? ({ games: gamesJson } as { games: Prisma.InputJsonValue })
        : {}),
      completedAt: new Date(),
    },
  });

  await prisma.match.update({
    where: { id: args.matchId },
    data: { status: MatchStatus.COMPLETED },
  });

  const winner = match.participants.find((p) => p.slot === args.winnerSlot);
  const loser = match.participants.find((p) => p.slot !== args.winnerSlot);

  // Grand final: winners-bracket champion → slot 0, losers-bracket champion → slot 1
  const nextWinner = match.nextWinnerMatchId
    ? await prisma.match.findUnique({
        where: { id: match.nextWinnerMatchId },
        select: { bracketSide: true },
      })
    : null;
  const winnerPreferredSlot =
    nextWinner?.bracketSide === "grand_final"
      ? match.bracketSide === "losers"
        ? 1
        : 0
      : undefined;

  if (winner?.tournamentTeamId && match.nextWinnerMatchId) {
    await placeTeamInMatch(
      match.nextWinnerMatchId,
      winner.tournamentTeamId,
      winner.teamLabel,
      winnerPreferredSlot,
    );
  }
  if (loser?.tournamentTeamId && match.nextLoserMatchId) {
    await placeTeamInMatch(
      match.nextLoserMatchId,
      loser.tournamentTeamId,
      loser.teamLabel,
    );
  }

  void leaderboardRepo.recomputeFromCompletedMatches().catch(() => {});

  let advancedStage = false;
  if (match.bracket.stageId) {
    const complete = await isStageMatchesComplete(match.bracket.stageId);
    if (complete) {
      await applyStageMovement(match.bracket.stageId);
      advancedStage = true;
    }
  }

  return { advancedStage };
}

/** Clear a recorded result so the match can be undecided again. */
export async function clearStageMatchResult(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      participants: true,
      result: true,
      bracket: { select: { stageId: true } },
    },
  });
  if (!match) throw new Error("Match not found.");
  if (!match.result) return;

  const winner = match.participants.find((p) => p.slot === match.result!.winnerSlot);
  const loser = match.participants.find((p) => p.slot !== match.result!.winnerSlot);

  await clearTeamFromNextMatch(match.nextWinnerMatchId, winner?.tournamentTeamId);
  await clearTeamFromNextMatch(match.nextLoserMatchId, loser?.tournamentTeamId);

  const stageId = match.bracket.stageId;
  const stageWasComplete = stageId
    ? (
        await prisma.tournamentStage.findUnique({
          where: { id: stageId },
          select: { status: true },
        })
      )?.status === "COMPLETE"
    : false;

  await prisma.matchResult.delete({ where: { matchId } });

  // Restore a playable match status (keep schedule / confirmations intact).
  const reopenStatus =
    match.scheduleStatus === "CONFIRMED" ? MatchStatus.LIVE : MatchStatus.SCHEDULED;
  await prisma.match.update({
    where: { id: matchId },
    data: { status: reopenStatus },
  });

  // If this result had finished the stage, reopen it and undo destination seeding.
  if (stageId && stageWasComplete) {
    await prisma.tournamentStage.updateMany({
      where: { id: stageId, status: "COMPLETE" },
      data: { status: "LIVE" },
    });
    await undoStageMovement(stageId);
  }

  void leaderboardRepo.recomputeFromCompletedMatches().catch(() => {});
}

/** Manually place (or clear) a team into a bracket match slot. */
export async function assignMatchParticipant(args: {
  matchId: string;
  slot: number;
  teamId: string | null;
  teamLabel?: string | null;
}): Promise<void> {
  if (args.slot !== 0 && args.slot !== 1) {
    throw new Error("slot must be 0 or 1.");
  }
  const match = await prisma.match.findUnique({
    where: { id: args.matchId },
    include: { result: true, participants: true },
  });
  if (!match) throw new Error("Match not found.");
  if (match.result) {
    throw new Error("Clear the match result before changing participants.");
  }

  const participant = match.participants.find((p) => p.slot === args.slot);
  if (!participant) throw new Error("Match slot not found.");

  if (args.teamId) {
    // Remove this team from the other slot of the same match if present
    await prisma.matchParticipant.updateMany({
      where: {
        matchId: args.matchId,
        tournamentTeamId: args.teamId,
        NOT: { id: participant.id },
      },
      data: { tournamentTeamId: null, teamLabel: null },
    });
  }

  await prisma.matchParticipant.update({
    where: { id: participant.id },
    data: {
      tournamentTeamId: args.teamId,
      teamLabel: args.teamId ? (args.teamLabel ?? null) : null,
      participantType: ParticipantType.TEAM,
    },
  });
}

export async function getStagePublicView(tournamentId: string) {
  const { mapStagesToPublic } = await import("./stage-query.service");
  return mapStagesToPublic(tournamentId);
}
