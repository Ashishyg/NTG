import { getPublicProfile, signOut } from "@auth-membership/index";
import { getSession } from "@core/auth/session";
import { prisma } from "@core/database/client";
import GameIdentityForm from "@/components/platform/GameIdentityForm";
import PlatformHeader from "@/components/platform/shell/PlatformHeader";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleSignOut() {
  "use server";
  if (signOut) {
    await signOut({ redirectTo: "/" });
  } else {
    redirect("/");
  }
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export const metadata = {
  title: "Profile — NTG Lounge",
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const [profile, user] = await Promise.all([
    getPublicProfile(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phone: true,
        riotGameName: true,
        riotTagLine: true,
        email: true,
      },
    }),
  ]);

  const displayName =
    profile?.displayName ?? session.user.name ?? "Your profile";
  const riotId =
    user?.riotGameName && user?.riotTagLine
      ? `${user.riotGameName}#${user.riotTagLine}`
      : null;

  const details = [
    { label: "Name", value: displayName },
    { label: "Riot ID", value: riotId ?? "Not linked" },
    { label: "Phone", value: formatPhone(user?.phone) },
  ];

  return (
    <div className="mx-auto max-w-lg">
      <PlatformHeader
        eyebrow="Player"
        title={displayName}
        subtitle={user?.email ?? session.user.email ?? undefined}
      />

      <div className="shine-border rounded-[1.5rem]">
        <div className="shine-border-inner space-y-8 rounded-[1.5rem] glass-strong p-7 sm:p-8">
          {profile?.town ? (
            <p className="text-xs uppercase tracking-[0.22em] text-white/40">
              {profile.town}
            </p>
          ) : null}

          <section>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">
              Player details
            </p>
            <dl className="mt-4 space-y-3">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                >
                  <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
                    {row.label}
                  </dt>
                  <dd
                    className={`text-right text-sm ${
                      row.label === "Riot ID" && !riotId
                        ? "text-white/35"
                        : row.label === "Riot ID"
                          ? "font-mono text-[var(--color-brand)]/90"
                          : "text-white/90"
                    }`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {!riotId ? (
            <section className="border-t border-white/[0.06] pt-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">
                Link Riot ID
              </p>
              <p className="mt-2 text-sm text-white/45">
                Required for Valorant cups. We verify it with Riot&apos;s API.
              </p>
              <div className="mt-4">
                <GameIdentityForm />
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-6">
            <Link
              href="/esports/tournaments"
              className="rounded-full border border-white/12 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/75 transition-colors hover:border-white/25 hover:text-white"
            >
              Browse cups
            </Link>
            <form action={handleSignOut} className="ml-auto">
              <button
                type="submit"
                className="rounded-full border border-red-500/25 bg-red-500/[0.08] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300/90 transition-colors hover:border-red-500/45 hover:bg-red-500/[0.14] hover:text-red-200"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
