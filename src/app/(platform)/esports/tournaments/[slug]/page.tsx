import { notFound } from "next/navigation";
import TournamentDetailView from "@/components/platform/TournamentDetailView";
import AdminTournamentForm from "@/components/platform/AdminTournamentForm";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import { getTournamentDetail } from "@tournaments-leagues/index";
import { prisma } from "@core/database/client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = await getTournamentDetail(slug);
  return { title: t ? `${t.name} — NTG Lounge` : "Tournament — NTG Lounge" };
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const userId = session?.user?.id;
  const tournament = await getTournamentDetail(slug, userId);

  if (!tournament) notFound();

  const admin = await requireAdmin();
  const placementMap = Object.fromEntries(
    tournament.placements.map((p) => [p.role, p.displayName]),
  );

  let previewName: string | null = null;
  let previewRiotId: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { playerProfile: true },
    });
    previewName = user?.playerProfile?.displayName ?? user?.name ?? null;
    previewRiotId =
      user?.riotGameName && user?.riotTagLine
        ? `${user.riotGameName}#${user.riotTagLine}`
        : null;
  }

  return (
    <>
      <TournamentDetailView
        tournament={tournament}
        isLoggedIn={!!userId}
        previewName={previewName}
        previewRiotId={previewRiotId}
      />
      {admin.ok ? (
        <div className="mt-16 border-t border-white/[0.06] pt-12">
          <AdminTournamentForm
            slug={slug}
            initial={{
              champion: placementMap.CHAMPION,
              runnerUp: placementMap.RUNNER_UP,
              mvp: placementMap.MVP,
              prizePool: tournament.prizePool ?? "",
              status: tournament.status,
            }}
          />
        </div>
      ) : null}
    </>
  );
}
