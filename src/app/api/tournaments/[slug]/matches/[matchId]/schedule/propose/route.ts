import { NextResponse } from "next/server";
import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { proposeMatchSchedule } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; matchId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const { matchId } = await params;
  try {
    const body = (await req.json()) as { scheduledAt?: string };
    if (!body.scheduledAt) {
      return NextResponse.json({ error: "scheduledAt is required." }, { status: 400 });
    }
    const when = new Date(body.scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt." }, { status: 400 });
    }
    await proposeMatchSchedule(matchId, auth.session.user.id, when);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to propose time.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
