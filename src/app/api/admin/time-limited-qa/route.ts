import { guardResponse, isAuthedAdmin, requireSuperAdmin } from "@/lib/superadmin-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import { getAdminQaView, updateQaCampaign } from "@time-limited-qa/index";
import { updateQaCampaignSchema } from "@time-limited-qa/domain/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSuperAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const view = await getAdminQaView();
  return NextResponse.json(view);
}

export async function PATCH(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSuperAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateQaCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update." },
      { status: 400 },
    );
  }

  const view = await updateQaCampaign({
    ...parsed.data,
    updatedById: auth.userId,
  });

  await logAdminAction(auth.userId, "time_limited_qa.update", view.slug, parsed.data);

  return NextResponse.json(view);
}
