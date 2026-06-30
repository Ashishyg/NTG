import { requireAdmin } from "@core/auth/require-admin";
import { redirect } from "next/navigation";
import AdminRosterPanel from "@/components/admin/AdminRosterPanel";
import { listRosterTeamsAdmin } from "@roster-listings/index";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Roster" };

export default async function AdminRosterPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login");

  const teams = await listRosterTeamsAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">NTG Roster</h1>
        <p className="mt-1 text-sm text-white/45">Manage official teams per game and recruiting status.</p>
      </div>
      <AdminRosterPanel initialTeams={teams} />
    </div>
  );
}
