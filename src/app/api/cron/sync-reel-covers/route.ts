import { isCronAuthorized } from "@/lib/cron-auth";
import { serverEnv } from "@core/config/env.server";
import { syncInstagramReelCovers } from "@socials-gallery/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!serverEnv.cronSecret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }

  if (serverEnv.instagramReelUrls.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, failed: [], message: "No reel URLs configured." });
  }

  try {
    const result = await syncInstagramReelCovers();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Reel cover sync failed." }, { status: 500 });
  }
}
