import { prisma } from "@core/database/client";
import { findUserByUsername } from "@auth-membership/application/registration-helpers";
import { VALORANT_ROSTER_MAX_PLAYERS, CS2_ROSTER_MAX_PLAYERS } from "@/lib/roster-games";
import { slugify } from "../domain/helpers";
import type { ValorantRole } from "@prisma/client";

export type RosterCandidateView = {
  id: string;
  displayName: string;
  email: string | null;
  inGameName: string | null;
  rankTier: string | null;
  rankTierId: number | null;
  roles: string[];
  cs2FaceitRank: string | null;
  cs2PeakPremierRank: string | null;
  steamPersonaName: string | null;
};

function riotIdFromUser(user: { riotGameName: string | null; riotTagLine: string | null }) {
  if (!user.riotGameName || !user.riotTagLine) return null;
  return `${user.riotGameName}#${user.riotTagLine}`;
}

function inGameNameForGame(
  gameKey: string,
  user: {
    riotGameName: string | null;
    riotTagLine: string | null;
    steamPersonaName: string | null;
    steamId64: string | null;
    playerProfile: { displayName: string } | null;
    name: string | null;
  },
): string | null {
  if (gameKey === "valorant") return riotIdFromUser(user);
  if (gameKey === "cs2") return user.steamPersonaName ?? user.steamId64;
  return user.playerProfile?.displayName ?? user.name;
}

function defaultRoleLabel(roles: ValorantRole[]): string | null {
  if (!roles.length) return null;
  return roles[0] ?? null;
}

export async function searchRosterCandidates(
  gameKey: string,
  search: string,
): Promise<RosterCandidateView[]> {
  const q = search.trim();
  if (q.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      signupCompleted: true,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { playerProfile: { displayName: { contains: q, mode: "insensitive" } } },
        { riotGameName: { contains: q, mode: "insensitive" } },
        { riotTagLine: { contains: q, mode: "insensitive" } },
        { steamPersonaName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      playerProfile: true,
      leaderboard: {
        where: {
          scope: "TOWN",
          game: gameKey === "valorant" ? "VALORANT" : gameKey === "cs2" ? "CS2" : "VALORANT",
        },
        take: 1,
      },
    },
  });

  return users.map((u) => {
    const rank = u.leaderboard[0];
    const roles = u.playerProfile?.valorantRoles ?? [];
    return {
      id: u.id,
      displayName: u.playerProfile?.displayName ?? u.name ?? u.email ?? "Player",
      email: u.email,
      inGameName: inGameNameForGame(gameKey, u),
      rankTier: rank?.rankTier ?? null,
      rankTierId: rank?.rankTierId ?? null,
      roles,
      cs2FaceitRank: u.playerProfile?.cs2FaceitRank ?? null,
      cs2PeakPremierRank: u.playerProfile?.cs2PeakPremierRank ?? null,
      steamPersonaName: u.steamPersonaName,
    };
  });
}

export async function listRosterTeamsAdmin() {
  return prisma.rosterTeam.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      players: {
        orderBy: { sortOrder: "asc" },
        include: {
          user: {
            include: {
              playerProfile: true,
              leaderboard: {
                where: { scope: "TOWN" },
              },
            },
          },
        },
      },
      _count: { select: { players: true } },
    },
  });
}

export async function getRosterTeamAdmin(gameKey: string) {
  return prisma.rosterTeam.findUnique({
    where: { gameKey },
    include: {
      players: {
        orderBy: { sortOrder: "asc" },
        include: {
          user: { include: { playerProfile: true } },
        },
      },
    },
  });
}

export async function createRosterTeam(input: {
  gameKey: string;
  gameLabel: string;
  status?: "ACTIVE" | "RECRUITING";
  benefitsMarkdown?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gameKey = slugify(input.gameKey);
  if (!gameKey) return { ok: false, error: "Invalid game key." };

  const existing = await prisma.rosterTeam.findUnique({ where: { gameKey } });
  if (existing) return { ok: false, error: "A roster for this game already exists." };

  const maxOrder = await prisma.rosterTeam.aggregate({ _max: { sortOrder: true } });

  await prisma.rosterTeam.create({
    data: {
      gameKey,
      gameLabel: input.gameLabel.trim(),
      status: input.status ?? "RECRUITING",
      benefitsMarkdown: input.benefitsMarkdown ?? null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return { ok: true };
}

export async function updateRosterTeam(
  gameKey: string,
  input: {
    gameLabel?: string;
    status?: "ACTIVE" | "RECRUITING";
    benefitsMarkdown?: string | null;
    tryoutsOpenAt?: string | null; // ISO date string or null to clear
    sortOrder?: number;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const team = await prisma.rosterTeam.findUnique({ where: { gameKey } });
  if (!team) return { ok: false, error: "Roster team not found." };

  await prisma.rosterTeam.update({
    where: { gameKey },
    data: {
      ...(input.gameLabel !== undefined ? { gameLabel: input.gameLabel.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.benefitsMarkdown !== undefined ? { benefitsMarkdown: input.benefitsMarkdown } : {}),
      ...(input.tryoutsOpenAt !== undefined
        ? { tryoutsOpenAt: input.tryoutsOpenAt ? new Date(input.tryoutsOpenAt) : null }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });

  return { ok: true };
}

export async function addRosterPlayer(
  gameKey: string,
  input: {
    userId?: string;
    username?: string;
    roleLabel?: string;
    bio?: string;
    sortOrder?: number;
    replace?: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const team = await prisma.rosterTeam.findUnique({
    where: { gameKey },
    include: { players: true },
  });
  if (!team) return { ok: false, error: "Roster team not found." };

  const replacingOccupiedSlot =
    Boolean(input.replace) &&
    input.sortOrder !== undefined &&
    team.players.some((p) => p.sortOrder === input.sortOrder);

  if (
    gameKey === "valorant" &&
    !replacingOccupiedSlot &&
    team.players.length >= VALORANT_ROSTER_MAX_PLAYERS
  ) {
    return { ok: false, error: `Valorant roster is limited to ${VALORANT_ROSTER_MAX_PLAYERS} players.` };
  }

  if (
    gameKey === "cs2" &&
    !replacingOccupiedSlot &&
    team.players.length >= CS2_ROSTER_MAX_PLAYERS
  ) {
    return { ok: false, error: `CS2 roster is limited to ${CS2_ROSTER_MAX_PLAYERS} players.` };
  }

  let fullUser: Awaited<ReturnType<typeof prisma.user.findUnique>> & {
    playerProfile: { valorantRoles: ValorantRole[] } | null;
  } | null = null;

  if (input.userId) {
    fullUser = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { playerProfile: true },
    });
  } else if (input.username?.trim()) {
    const found = await findUserByUsername(input.username.trim());
    if (!found) return { ok: false, error: "Member username not found." };
    fullUser = await prisma.user.findUnique({
      where: { id: found.id },
      include: { playerProfile: true },
    });
  }

  if (!fullUser) return { ok: false, error: "Select a member to add." };

  const onTeam = team.players.some((p) => p.userId === fullUser.id);
  if (onTeam) return { ok: false, error: "This member is already on the roster." };

  let sortOrder: number;
  if (input.sortOrder !== undefined) {
    const maxSlots =
      gameKey === "valorant"
        ? VALORANT_ROSTER_MAX_PLAYERS
        : gameKey === "cs2"
          ? CS2_ROSTER_MAX_PLAYERS
          : 99;
    if ((gameKey === "valorant" || gameKey === "cs2") && input.sortOrder >= maxSlots) {
      return { ok: false, error: `Slot must be 1 through ${maxSlots}.` };
    }
    if (
      (gameKey === "cs2" || gameKey === "valorant") &&
      input.roleLabel?.trim().toUpperCase() === "IGL" &&
      input.sortOrder !== 2
    ) {
      return { ok: false, error: "IGL can only be assigned to Slot 3." };
    }
    const occupant = team.players.find((p) => p.sortOrder === input.sortOrder);
    if (occupant) {
      if (!input.replace) {
        return {
          ok: false,
          error: `Player ${input.sortOrder + 1} is already filled. Remove them first or pick another slot.`,
        };
      }
      await prisma.rosterPlayer.delete({ where: { id: occupant.id } });
    }
    sortOrder = input.sortOrder;
  } else {
    const maxOrder = team.players.reduce((m, p) => Math.max(m, p.sortOrder), -1);
    sortOrder = maxOrder + 1;
  }

  const roles = fullUser.playerProfile?.valorantRoles ?? [];
  const roleLabel =
    input.roleLabel?.trim() ||
    (gameKey === "valorant" ? defaultRoleLabel(roles) : null) ||
    null;

  await prisma.rosterPlayer.create({
    data: {
      rosterTeamId: team.id,
      userId: fullUser.id,
      roleLabel,
      bio: input.bio?.trim() || null,
      sortOrder,
    },
  });

  return { ok: true };
}

export async function removeRosterPlayer(
  gameKey: string,
  playerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const team = await prisma.rosterTeam.findUnique({ where: { gameKey } });
  if (!team) return { ok: false, error: "Roster team not found." };

  const player = await prisma.rosterPlayer.findFirst({
    where: { id: playerId, rosterTeamId: team.id },
  });
  if (!player) return { ok: false, error: "Player not found on this roster." };

  await prisma.rosterPlayer.delete({ where: { id: playerId } });
  return { ok: true };
}

export async function deleteRosterTeam(
  gameKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const team = await prisma.rosterTeam.findUnique({ where: { gameKey } });
  if (!team) return { ok: false, error: "Roster team not found." };

  await prisma.rosterTeam.delete({ where: { gameKey } });
  return { ok: true };
}
