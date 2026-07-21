import { NextResponse } from "next/server";
import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { confirmMatchSchedule } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; matchId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const { matchId } = await params;
  try {
    await confirmMatchSchedule(matchId, auth.session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to confirm.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
