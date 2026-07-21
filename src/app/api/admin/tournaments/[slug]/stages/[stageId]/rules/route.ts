import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { putStageRules } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; stageId: string }> };

export async function PUT(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const body = await req.json();
    const rules = Array.isArray(body) ? body : body.rules;
    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "rules array required." }, { status: 400 });
    }
    const graph = await putStageRules(slug, stageId, rules);
    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update rules.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
