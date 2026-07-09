import { redirect } from "next/navigation";
import { getSession } from "@core/auth/session";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { getAdminQaView, listQaResponses } from "@time-limited-qa/index";
import AdminTimeLimitedPanel from "@/components/admin/AdminTimeLimitedPanel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Time Limited Q&A" };

export default async function AdminTimeLimitedPage() {
  const session = await getSession();
  if (!isSuperAdminEmail(session?.user?.email)) {
    redirect("/admin");
  }

  const [view, responses] = await Promise.all([getAdminQaView(), listQaResponses()]);

  return (
    <AdminTimeLimitedPanel
      initialFields={view.formFields}
      initialResponses={responses}
      title={view.title}
      description={view.description}
    />
  );
}
