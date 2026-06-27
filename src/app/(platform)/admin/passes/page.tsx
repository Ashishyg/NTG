import AdminPassesPanel from "@/components/admin/AdminPassesPanel";
import { listAllGamepassPlansAdmin } from "@lounge-commerce/index";
import { serverEnv } from "@core/config/env.server";

export const metadata = { title: "Admin Passes" };

export default async function AdminPassesPage() {
  const plans = serverEnv.databaseUrl ? await listAllGamepassPlansAdmin() : [];

  return <AdminPassesPanel initialPlans={plans} />;
}
