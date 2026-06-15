import { redirect } from "next/navigation";
import Link from "next/link";
import PlatformHeader from "@/components/platform/shell/PlatformHeader";
import { requireAdmin } from "@core/auth/require-admin";
import { listTournamentPreviews } from "@tournaments-leagues/index";

export const metadata = {
  title: "Admin — NTG Lounge",
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    redirect("/login?callbackUrl=/admin");
  }

  const tournaments = await listTournamentPreviews();

  return (
    <>
      <PlatformHeader
        eyebrow="Admin"
        title="Tournament control"
        subtitle="Pick a cup to update results, prizepool, or registration status."
      />
      <ul className="space-y-3">
        {tournaments.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/esports/tournaments/${t.slug}`}
              className="flex items-center justify-between rounded-[1.15rem] border border-white/[0.07] bg-white/[0.02] px-5 py-4 transition-colors hover:border-amber-500/25 hover:bg-amber-500/[0.03]"
            >
              <span className="font-medium text-white/85">{t.name}</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                {t.status.replace(/_/g, " ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
