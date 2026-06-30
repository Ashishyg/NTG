import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import { updateListingApplicationStatus, deleteListingApplication } from "@roster-listings/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ applicationId: string }> };

export async function PATCH(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { applicationId } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "PENDING" && body.status !== "APPROVED" && body.status !== "REJECTED") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const result = await updateListingApplicationStatus(applicationId, body.status);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "listing.application.update", applicationId, {
    status: body.status,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { applicationId } = await params;
  const result = await deleteListingApplication(applicationId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await logAdminAction(auth.userId, "listing.application.delete", applicationId);

  return NextResponse.json({ ok: true });
}
