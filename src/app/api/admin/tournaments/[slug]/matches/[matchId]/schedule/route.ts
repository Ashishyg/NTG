import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { adminSetMatchSchedule } from "@/modules/tournaments-leagues/application/stages/match-schedule.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; matchId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { matchId } = await params;
  try {
    const body = (await req.json()) as {
      scheduledAt?: string;
      forceConfirm?: boolean;
    };
    if (!body.scheduledAt) {
      return NextResponse.json({ error: "scheduledAt is required." }, { status: 400 });
    }
    const when = new Date(body.scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt." }, { status: 400 });
    }
    await adminSetMatchSchedule(matchId, when, {
      forceConfirm: Boolean(body.forceConfirm),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set schedule.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
