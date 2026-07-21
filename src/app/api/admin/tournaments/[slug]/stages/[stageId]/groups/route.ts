import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { putStageGroups } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; stageId: string }> };

export async function PUT(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const body = await req.json();
    const groups = Array.isArray(body) ? body : body.groups;
    if (!Array.isArray(groups)) {
      return NextResponse.json({ error: "groups array required." }, { status: 400 });
    }
    const graph = await putStageGroups(slug, stageId, groups);
    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update groups.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
