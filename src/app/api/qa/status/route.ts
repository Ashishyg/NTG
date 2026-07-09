import { isTimeLimitedQaPubliclyVisible } from "@time-limited-qa/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await isTimeLimitedQaPubliclyVisible();
  return NextResponse.json({ enabled });
}
