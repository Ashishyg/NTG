import { getPublicQaView } from "@time-limited-qa/index";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const view = await getPublicQaView();
  if (!view) {
    return NextResponse.json({ error: "Q&A is not available." }, { status: 404 });
  }

  return NextResponse.json(view);
}
