import { requireAdmin } from "@core/auth/require-admin";
import { redirect } from "next/navigation";
import AdminListingsPanel from "@/components/admin/AdminListingsPanel";
import { listListingsAdmin } from "@roster-listings/index";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Listings" };

export default async function AdminListingsPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login");

  const listings = await listListingsAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Listings</h1>
        <p className="mt-1 text-sm text-white/45">Jobs and team tryout openings.</p>
      </div>
      <AdminListingsPanel initialListings={listings} />
    </div>
  );
}
