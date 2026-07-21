import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { getStageMatchesAdmin } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ slug: string; stageId: string }> };

/** Fast path: match payloads for one stage only (Matches tab). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const result = await getStageMatchesAdmin(slug, stageId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load matches.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
