import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import {
  commitStageAndGenerate,
  generateStageMatches,
  type StageCommitDraft,
} from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ slug: string; stageId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      drafts?: StageCommitDraft[];
    };

    if (body.drafts?.length) {
      const result = await commitStageAndGenerate(slug, stageId, body.drafts);
      return NextResponse.json(result);
    }

    const result = await generateStageMatches(slug, stageId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate matches.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
