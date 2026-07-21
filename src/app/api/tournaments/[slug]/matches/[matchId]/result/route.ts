import { NextResponse } from "next/server";
import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { submitMatchResultWithProof } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; matchId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const { matchId } = await params;
  try {
    const body = (await req.json()) as {
      winnerSlot?: number;
      scoreA?: number;
      scoreB?: number;
      screenshotUrl?: string;
    };
    if (body.winnerSlot !== 0 && body.winnerSlot !== 1) {
      return NextResponse.json({ error: "winnerSlot must be 0 or 1." }, { status: 400 });
    }
    if (typeof body.scoreA !== "number" || typeof body.scoreB !== "number") {
      return NextResponse.json({ error: "scoreA and scoreB are required." }, { status: 400 });
    }
    if (!body.screenshotUrl?.trim()) {
      return NextResponse.json({ error: "screenshotUrl is required." }, { status: 400 });
    }

    const result = await submitMatchResultWithProof({
      matchId,
      userId: auth.session.user.id,
      winnerSlot: body.winnerSlot,
      scoreA: body.scoreA,
      scoreB: body.scoreB,
      screenshotUrl: body.screenshotUrl,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit result.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
