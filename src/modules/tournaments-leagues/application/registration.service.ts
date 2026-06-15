import { prisma } from "@core/database/client";
import type { RegistrationResult } from "@core/contracts";
import { GameSlug } from "@prisma/client";

export async function registerForTournament(
  slug: string,
  userId: string,
): Promise<RegistrationResult> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return { ok: false, error: "Tournament not found." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });

  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  if (!user.emailVerified || !user.signupCompleted) {
    return { ok: false, error: "Complete signup before registering for cups." };
  }

  if (tournament.game === GameSlug.VALORANT && !user.riotPuuid) {
    return { ok: false, error: "Link your Riot ID in profile to join Valorant cups." };
  }

  const now = new Date();
  if (tournament.status !== "REGISTRATION_OPEN") {
    return { ok: false, error: "Registration is not open for this tournament." };
  }
  if (tournament.hideAfter && tournament.hideAfter <= now) {
    return { ok: false, error: "Registration has closed." };
  }

  const snapshotRiotId =
    user.riotGameName && user.riotTagLine
      ? `${user.riotGameName}#${user.riotTagLine}`
      : null;

  try {
    const reg = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        userId,
        snapshotDisplayName: user.playerProfile?.displayName ?? user.name,
        snapshotRiotId,
        snapshotPhone: user.phone,
        status: "APPROVED",
      },
    });
    return { ok: true, registrationId: reg.id };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return { ok: false, error: "You are already registered for this tournament." };
    }
    throw e;
  }
}

export type SetPlacementInput = {
  role: import("@prisma/client").PlacementRole;
  teamLabel?: string;
  userId?: string;
};

export async function setTournamentPlacements(
  slug: string,
  placements: SetPlacementInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return { ok: false, error: "Tournament not found." };
  }

  await prisma.$transaction(
    placements.map((p) =>
      prisma.tournamentPlacement.upsert({
        where: {
          tournamentId_role: { tournamentId: tournament.id, role: p.role },
        },
        create: {
          tournamentId: tournament.id,
          role: p.role,
          teamLabel: p.teamLabel ?? null,
          userId: p.userId ?? null,
        },
        update: {
          teamLabel: p.teamLabel ?? null,
          userId: p.userId ?? null,
        },
      }),
    ),
  );

  return { ok: true };
}

export type UpdateTournamentAdminInput = {
  status?: "DRAFT" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  prizePool?: number;
  prizeNotes?: string;
  hideAfter?: string | null;
};

export async function updateTournamentAdmin(
  slug: string,
  input: UpdateTournamentAdminInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return { ok: false, error: "Tournament not found." };
  }

  await prisma.tournament.update({
    where: { slug },
    data: {
      status: input.status,
      prizePool: input.prizePool,
      prizeNotes: input.prizeNotes,
      hideAfter: input.hideAfter === null ? null : input.hideAfter ? new Date(input.hideAfter) : undefined,
    },
  });

  return { ok: true };
}
