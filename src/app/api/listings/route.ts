import { serverEnv } from "@core/config/env.server";
import { listOpenListings } from "@roster-listings/index";
import type { ListingType } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as ListingType | null;
  const listings = await listOpenListings(
    type === "JOB" || type === "ROSTER_TRYOUT" ? type : undefined,
  );
  return NextResponse.json({ listings });
}
