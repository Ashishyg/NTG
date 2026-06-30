import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  listListingApplicationsAdmin,
  buildListingApplicationsCsv,
  listListingFormFields,
} from "@roster-listings/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  const rows = await listListingApplicationsAdmin(slug);
  if (!rows) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("format") === "csv") {
    const formFields = (await listListingFormFields(slug)) ?? [];
    const csv = buildListingApplicationsCsv(
      rows,
      formFields.map((f) => ({ id: f.id, label: f.label })),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-applications.csv"`,
      },
    });
  }

  return NextResponse.json({ applications: rows });
}
