import { notFound } from "next/navigation";
import TournamentDetailView from "@/components/platform/TournamentDetailView";
import { fetchChallongeBracket } from "@/lib/challonge-api";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import {
  getTournamentDetail,
  getRegistrationEligibility,
  getValorantRegistrationProfileCard,
  listMyGames,
  mapStagesToPublic,
} from "@tournaments-leagues/index";
import { serverEnv } from "@core/config/env.server";
import { auctionLink } from "@/lib/auction-link";
import { prisma } from "@core/database/client";
import { resolveEffectivePublicAuction } from "@tournaments-leagues/domain/auction-hero-phase";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = await getTournamentDetail(slug).catch(() => null);
  return { title: t ? t.name : "Tournament" };
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const userId = session?.user?.id;

  let tournament;
  try {
    tournament = await getTournamentDetail(slug, userId);
  } catch (err) {
    console.error("[tournament-detail] getTournamentDetail failed:", slug, err);
    throw err;
  }
  if (!tournament) notFound();

  let stages: Awaited<ReturnType<typeof mapStagesToPublic>> = [];
  try {
    stages = await mapStagesToPublic(tournament.id);
  } catch (err) {
    console.error("[tournament-detail] mapStagesToPublic failed:", slug, err);
  }

  let publicAuction = false;
  let yourGamesEnabled = true;
  try {
    const [dbRow] = await prisma.$queryRawUnsafe<
      { publicAuction: boolean; yourGamesEnabled: boolean }[]
    >(
      'SELECT "publicAuction", "yourGamesEnabled" FROM "Tournament" WHERE id = $1 LIMIT 1',
      tournament.id,
    );
    publicAuction = resolveEffectivePublicAuction(
      dbRow?.publicAuction ?? false,
      tournament,
    );
    yourGamesEnabled = dbRow?.yourGamesEnabled ?? true;
  } catch (err) {
    console.error("[tournament-detail] publicAuction lookup failed:", slug, err);
    publicAuction = resolveEffectivePublicAuction(false, tournament);
    yourGamesEnabled = true;
  }

  const [admin, registrationPreview, myGames] = await Promise.all([
    requireAdmin(),
    userId ? getRegistrationEligibility(slug, userId) : Promise.resolve(null),
    userId && yourGamesEnabled
      ? listMyGames(slug, userId).catch(() => ({ games: [], hasTeam: false }))
      : Promise.resolve(null),
  ]);

  const bracket =
    stages.length === 0 && tournament.bracketUrl
      ? await fetchChallongeBracket(tournament.bracketUrl)
      : null;

  const registrationProfileCard =
    userId && tournament.game === "VALORANT" && tournament.userRegistered
      ? await getValorantRegistrationProfileCard(slug, userId)
      : null;

  tournament = { ...tournament, yourGamesEnabled };

  const auctionView = admin.ok
    ? "auctioneer"
    : tournament.userParticipantRole === "CAPTAIN" ||
        tournament.userParticipantRole === "CO_CAPTAIN"
      ? "captain"
      : "observe";
  const auctionEligible =
    tournament.registrationFormat === "AUCTION" &&
    !!userId &&
    tournament.userRegistered &&
    !!serverEnv.auctionUrl &&
    !!serverEnv.auctionJwtSecret;
  const showEnterButton = admin.ok || (auctionEligible && publicAuction);
  const auctionHref =
    showEnterButton && userId
      ? auctionLink(tournament.id, auctionView, userId)
      : null;
  const auctionEnded =
    auctionEligible && !admin.ok && tournament.status === "COMPLETED";

  return (
    <>
      <TournamentDetailView
        tournament={tournament}
        bracket={bracket}
        stages={stages}
        isLoggedIn={!!userId}
        registrationPreview={registrationPreview}
        registrationProfileCard={registrationProfileCard}
        auctionHref={auctionHref}
        auctionEnded={auctionEnded}
        initialMyGames={myGames}
      />
      {admin.ok ? (
        <div className="mt-16 border-t border-white/[0.06] pt-8 text-center">
          <a
            href={`/admin/tournaments/${slug}`}
            className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            Edit in admin →
          </a>
        </div>
      ) : null}
    </>
  );
}
