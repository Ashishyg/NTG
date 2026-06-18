import { serverEnv } from "@core/config/env.server";
import { getHomePreviews } from "@landing-home/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json(
      { error: "Preview API requires DATABASE_URL", module: "landing-home" },
      { status: 501 },
    );
  }
  try {
    const previews = await getHomePreviews();
    return NextResponse.json({ previews });
  } catch (e) {
    return NextResponse.json(
      { error: "Preview fetch failed", module: "landing-home" },
      { status: 500 },
    );
  }
}
