import { notFound } from "next/navigation";
import { getSession } from "@core/auth/session";
import { prisma } from "@core/database/client";
import { getPublicQaView } from "@time-limited-qa/index";
import QaApplyForm from "@/components/platform/qa/QaApplyForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Q&A" };

export default async function QaPage() {
  const view = await getPublicQaView();
  if (!view) notFound();

  const session = await getSession();
  const userId = session?.user?.id;

  let memberDisplayName: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        playerProfile: { select: { displayName: true } },
      },
    });
    memberDisplayName =
      user?.playerProfile?.displayName?.trim() || user?.name?.trim() || null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 lg:max-w-4xl">
      <QaApplyForm
        title={view.title}
        description={view.description}
        formFields={view.formFields}
        isLoggedIn={Boolean(userId)}
        memberDisplayName={memberDisplayName}
      />
    </div>
  );
}
