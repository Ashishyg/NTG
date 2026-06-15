import { prisma } from "@core/database/client";
import type {
  LeaderboardPreview,
  TournamentPreview,
  TournamentRegistrationBanner,
} from "@core/contracts";
import { TournamentRepository } from "../infrastructure/tournament.repository";
import { LeaderboardRepository } from "../infrastructure/leaderboard.repository";

const tournamentRepo = new TournamentRepository();
const leaderboardRepo = new LeaderboardRepository();

export async function listTournamentPreviews(): Promise<TournamentPreview[]> {
  return tournamentRepo.listPreviews();
}

export async function getTournamentBySlug(slug: string): Promise<TournamentPreview | null> {
  return tournamentRepo.findPreviewBySlug(slug);
}

export async function getTournamentDetail(slug: string, userId?: string) {
  return tournamentRepo.findDetailBySlug(slug, userId);
}

export async function getActiveRegistrationBanner(): Promise<TournamentRegistrationBanner | null> {
  return tournamentRepo.findActiveRegistrationBanner();
}

export async function getLeaderboardPreview(
  game: Parameters<LeaderboardRepository["listPreview"]>[0],
  limit = 10,
): Promise<LeaderboardPreview> {
  return leaderboardRepo.listPreview(game, limit);
}

export async function getValorantRankings(
  limit = 250,
  search?: string,
): Promise<LeaderboardPreview> {
  return leaderboardRepo.listValorantRankings({ limit, search });
}

export async function recordMatchResult(
  matchId: string,
  winnerSlot: number,
  scoreSummary?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.matchResult.upsert({
      where: { matchId },
      create: { matchId, winnerSlot, scoreSummary },
      update: { winnerSlot, scoreSummary, completedAt: new Date() },
    });
    await tx.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED" },
    });
  });
  // Leaderboard recompute runs in same module — reads match results from DB
  await leaderboardRepo.recomputeFromCompletedMatches();
}
