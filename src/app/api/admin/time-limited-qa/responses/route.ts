import { guardResponse, isAuthedAdmin, requireSuperAdmin } from "@/lib/superadmin-guard";
import { serverEnv } from "@core/config/env.server";
import { buildQaResponsesCsv, listQaResponses } from "@time-limited-qa/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSuperAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("format") === "csv") {
    const csv = await buildQaResponsesCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="qa-responses.csv"',
      },
    });
  }

  const responses = await listQaResponses();
  return NextResponse.json({ responses });
}
