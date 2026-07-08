import { prisma } from "@core/database/client";
import type { RosterPlayerView, RosterTeamView } from "@core/contracts/roster-listings";
import { rosterPresetLabel } from "@/lib/roster-games";
import type { ValorantRole } from "@prisma/client";
import {
  advanceTryoutWindow,
  formatTryoutSchedulePhase,
  isTryoutApplicationLive,
} from "../domain/tryout-schedule";
import { syncTryoutListingStatus } from "./tryout-schedule.service";

function formatRiotId(user: {
  riotGameName: string | null;
  riotTagLine: string | null;
}): string | null {
  if (!user.riotGameName || !user.riotTagLine) return null;
  return `${user.riotGameName}#${user.riotTagLine}`;
}

function mapPlayer(
  row: {
    id: string;
    userId: string;
    roleLabel: string | null;
    bio: string | null;
    sortOrder: number;
    user: {
      riotGameName: string | null;
      riotTagLine: string | null;
      riotPlayerCard: string | null;
      riotPlayerCardWide: string | null;
      steamId64: string | null;
      steamPersonaName: string | null;
      steamAvatarUrl: string | null;
      playerProfile: {
        displayName: string;
        valorantRoles: ValorantRole[];
        cs2PeakPremierRank: string | null;
        cs2FaceitRank: string | null;
      } | null;
      name: string | null;
      leaderboard: {
        rankTier: string | null;
        rankTierId: number | null;
        mmr: number | null;
      }[];
    };
  },
): RosterPlayerView {
  const rank = row.user.leaderboard[0];
  const roles = row.user.playerProfile?.valorantRoles ?? [];
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.user.playerProfile?.displayName ?? row.user.name ?? "Player",
    riotId: formatRiotId(row.user),
    riotPlayerCard: row.user.riotPlayerCard,
    riotPlayerCardWide: row.user.riotPlayerCardWide,
    rankTier: rank?.rankTier ?? null,
    rankTierId: rank?.rankTierId ?? null,
    mmr: rank?.mmr ?? null,
    valorantRoles: roles,
    roleLabel: row.roleLabel ?? roles[0] ?? null,
    bio: row.bio,
    steamId64: row.user.steamId64,
    steamPersonaName: row.user.steamPersonaName,
    steamAvatarUrl: row.user.steamAvatarUrl,
    cs2PeakPremierRank: row.user.playerProfile?.cs2PeakPremierRank ?? null,
    cs2FaceitRank: row.user.playerProfile?.cs2FaceitRank ?? null,
    sortOrder: row.sortOrder,
  };
}

export async function listRosterTeams(): Promise<RosterTeamView[]> {
  await syncTryoutListingStatus();

  const [teams, tryoutListings] = await Promise.all([
    prisma.rosterTeam.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        players: {
          orderBy: { sortOrder: "asc" },
          include: {
            user: {
              include: {
                playerProfile: true,
                leaderboard: {
                  where: { game: "VALORANT", scope: "TOWN" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    prisma.listing.findMany({
      where: { type: "ROSTER_TRYOUT", gameKey: { not: null } },
      select: {
        slug: true,
        gameKey: true,
        status: true,
        autoManageTryout: true,
        tryoutOpensAt: true,
        tryoutClosesAt: true,
        tryoutOpenDays: true,
        tryoutRepeatDays: true,
      },
    }),
  ]);

  const tryoutByGame = new Map(
    tryoutListings
      .filter((l) => l.gameKey)
      .map((l) => [l.gameKey!, l] as const),
  );

  return teams.map((team) => {
    const listing = tryoutByGame.get(team.gameKey);
    const schedule = listing
      ? {
          type: "ROSTER_TRYOUT" as const,
          status: listing.status,
          autoManageTryout: listing.autoManageTryout,
          tryoutOpensAt: listing.tryoutOpensAt,
          tryoutClosesAt: listing.tryoutClosesAt,
          tryoutOpenDays: listing.tryoutOpenDays,
          tryoutRepeatDays: listing.tryoutRepeatDays,
        }
      : null;

    const window = schedule ? advanceTryoutWindow(schedule) : null;

    return {
      id: team.id,
      gameKey: team.gameKey,
      gameLabel: rosterPresetLabel(team.gameKey, team.gameLabel),
      status: team.status,
      benefitsMarkdown: team.benefitsMarkdown,
      tryoutOpensAt: window?.opensAt.toISOString() ?? listing?.tryoutOpensAt?.toISOString() ?? null,
      tryoutClosesAt: window?.closesAt.toISOString() ?? listing?.tryoutClosesAt?.toISOString() ?? null,
      tryoutIsLive: schedule ? isTryoutApplicationLive(schedule) : false,
      tryoutSchedulePhase: schedule ? formatTryoutSchedulePhase(schedule) : "unscheduled",
      sortOrder: team.sortOrder,
      players: team.players.map(mapPlayer),
      tryoutListingSlug: listing?.slug ?? null,
    };
  });
}

export async function getRosterTeamByGameKey(gameKey: string): Promise<RosterTeamView | null> {
  const teams = await listRosterTeams();
  return teams.find((t) => t.gameKey === gameKey) ?? null;
}
