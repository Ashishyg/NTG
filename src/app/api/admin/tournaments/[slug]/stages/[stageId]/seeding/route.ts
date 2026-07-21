import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { putStageSeeding } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; stageId: string }> };

export async function PUT(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const body = await req.json();
    const seeding = Array.isArray(body) ? body : body.seeding;
    if (!Array.isArray(seeding)) {
      return NextResponse.json({ error: "seeding array required." }, { status: 400 });
    }
    const method =
      body?.method === "RANDOM" || body?.method === "MANUAL" ? body.method : undefined;
    const graph = await putStageSeeding(slug, stageId, seeding, { method });
    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update seeding.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
