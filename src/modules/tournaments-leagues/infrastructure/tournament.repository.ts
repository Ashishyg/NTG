import { prisma } from "@core/database/client";
import type { TournamentDetail } from "@core/contracts";
import type { GameSlug, TournamentStatus } from "@prisma/client";

export class TournamentRepository {
  async listPreviews() {
    const rows = await prisma.tournament.findMany({
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      include: { season: true },
    });
    return rows.map((t) => this.toPreview(t));
  }

  async findPreviewBySlug(slug: string) {
    const t = await prisma.tournament.findUnique({
      where: { slug },
      include: { season: true },
    });
    return t ? this.toPreview(t) : null;
  }

  async findDetailBySlug(slug: string, userId?: string): Promise<TournamentDetail | null> {
    const t = await prisma.tournament.findUnique({
      where: { slug },
      include: {
        season: true,
        placements: {
          include: {
            user: { include: { playerProfile: true } },
          },
        },
        bracket: {
          include: {
            matches: {
              orderBy: [{ roundNumber: "asc" }, { positionInRound: "asc" }],
              include: {
                participants: {
                  include: { user: { include: { playerProfile: true } } },
                },
                result: true,
              },
            },
          },
        },
        registrations: userId
          ? { where: { userId }, select: { id: true } }
          : { select: { id: true } },
        _count: { select: { registrations: true } },
      },
    });
    if (!t) return null;

    const now = new Date();
    const registrationOpen =
      t.status === "REGISTRATION_OPEN" &&
      (!t.hideAfter || t.hideAfter > now);

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      game: t.game,
      gameLabel: t.gameLabel,
      seasonLabel: t.season?.label ?? null,
      status: t.status,
      startsAt: t.startsAt?.toISOString() ?? null,
      endsAt: t.endsAt?.toISOString() ?? null,
      prizePool: t.prizePool?.toString() ?? null,
      prizeNotes: t.prizeNotes,
      registrationOpen,
      placements: t.placements.map((p) => ({
        role: p.role,
        displayName:
          p.user?.playerProfile?.displayName ?? p.user?.name ?? p.teamLabel ?? "TBD",
        teamLabel: p.teamLabel,
      })),
      matches:
        t.bracket?.matches.map((m) => ({
          id: m.id,
          roundNumber: m.roundNumber,
          positionInRound: m.positionInRound,
          status: m.status,
          scoreSummary: m.result?.scoreSummary ?? null,
          participants: m.participants.map((p) => ({
            slot: p.slot,
            label:
              p.teamLabel ??
              p.user?.playerProfile?.displayName ??
              p.user?.name ??
              `Slot ${p.slot}`,
          })),
        })) ?? [],
      registrationCount: t._count.registrations,
      userRegistered: userId ? t.registrations.length > 0 : false,
    };
  }

  async findActiveRegistrationBanner() {
    const now = new Date();
    const t = await prisma.tournament.findFirst({
      where: {
        status: "REGISTRATION_OPEN",
        OR: [{ hideAfter: null }, { hideAfter: { gt: now } }],
      },
      orderBy: { startsAt: "asc" },
    });
    if (!t) return null;

    const href = `/esports/tournaments/${t.slug}`;
    const detail = t.gameLabel ?? t.game;
    const dateStr = t.startsAt
      ? t.startsAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : null;

    return {
      active: true,
      tournamentSlug: t.slug,
      title: t.name,
      detail: dateStr ? `${detail} · ${dateStr}` : detail,
      message: `Registrations are live for ${t.name}.`,
      href,
      hideAfter: t.hideAfter?.toISOString().slice(0, 10) ?? null,
    };
  }

  private toPreview(t: {
    id: string;
    slug: string;
    name: string;
    game: GameSlug;
    gameLabel: string | null;
    status: TournamentStatus;
    startsAt: Date | null;
    registrationUrl: string | null;
    season: { label: string } | null;
  }) {
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      game: t.game,
      gameLabel: t.gameLabel,
      seasonLabel: t.season?.label ?? null,
      status: t.status,
      startsAt: t.startsAt?.toISOString() ?? null,
      registrationUrl: t.registrationUrl,
    };
  }
}
