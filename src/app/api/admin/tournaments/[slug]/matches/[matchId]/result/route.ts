import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import {
  clearStageMatchResult,
  recordMatchResult,
  submitMatchResultWithProof,
} from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; matchId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { matchId } = await params;
  try {
    const body = (await req.json()) as {
      winnerSlot?: number | null;
      clear?: boolean;
      scoreSummary?: string;
      scoreA?: number;
      scoreB?: number;
      screenshotUrl?: string;
    };

    if (body.clear === true || body.winnerSlot === null) {
      await clearStageMatchResult(matchId);
      return NextResponse.json({ ok: true, cleared: true });
    }

    if (body.winnerSlot !== 0 && body.winnerSlot !== 1) {
      return NextResponse.json({ error: "winnerSlot must be 0 or 1." }, { status: 400 });
    }

    if (typeof body.scoreA === "number" && typeof body.scoreB === "number") {
      await submitMatchResultWithProof({
        matchId,
        userId: auth.session.user.id,
        winnerSlot: body.winnerSlot,
        scoreA: body.scoreA,
        scoreB: body.scoreB,
        screenshotUrl: body.screenshotUrl ?? "",
        adminOverride: true,
      });
      return NextResponse.json({ ok: true });
    }

    await recordMatchResult(matchId, body.winnerSlot, body.scoreSummary);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record result.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
