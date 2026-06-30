import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { getDefaultFormTemplate } from "@roster-listings/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  await params;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (type !== "JOB" && type !== "ROSTER_TRYOUT") {
    return NextResponse.json({ error: "Invalid template type." }, { status: 400 });
  }

  return NextResponse.json({ fields: getDefaultFormTemplate(type) });
}
