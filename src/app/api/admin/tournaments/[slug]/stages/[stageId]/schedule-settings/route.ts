import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { updateStageScheduleSettings } from "@tournaments-leagues/index";
import { prisma } from "@core/database/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; stageId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
    }
    const stage = await prisma.tournamentStage.findFirst({
      where: { id: stageId, tournamentId: tournament.id },
      select: { id: true },
    });
    if (!stage) {
      return NextResponse.json({ error: "Stage not found." }, { status: 404 });
    }

    const body = (await req.json()) as {
      finishesAt?: string | null;
      resultWindowHours?: number | null;
    };

    await updateStageScheduleSettings(stageId, {
      finishesAt: body.finishesAt,
      resultWindowHours: body.resultWindowHours,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
