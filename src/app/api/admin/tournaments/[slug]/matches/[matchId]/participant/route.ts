import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { assignMatchParticipant } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; matchId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { matchId } = await params;
  try {
    const body = (await req.json()) as {
      slot?: number;
      teamId?: string | null;
      teamLabel?: string | null;
    };
    if (body.slot !== 0 && body.slot !== 1) {
      return NextResponse.json({ error: "slot must be 0 or 1." }, { status: 400 });
    }
    await assignMatchParticipant({
      matchId,
      slot: body.slot,
      teamId: body.teamId ?? null,
      teamLabel: body.teamLabel ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assign team.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
