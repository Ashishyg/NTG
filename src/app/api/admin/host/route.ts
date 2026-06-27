import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import {
  deleteSponsorLogoAdmin,
  listAllHostOfferingsAdmin,
  listAllSponsorLogosAdmin,
  upsertHostOfferingAdmin,
  upsertSponsorLogoAdmin,
} from "@lounge-commerce/index";
import type { HostOfferingType } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const [offerings, sponsorLogos] = await Promise.all([
    listAllHostOfferingsAdmin(),
    listAllSponsorLogosAdmin(),
  ]);

  return NextResponse.json({ offerings, sponsorLogos });
}

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "sponsorLogo") {
    const logo = await upsertSponsorLogoAdmin({
      id: body.id ? String(body.id) : undefined,
      name: String(body.name ?? ""),
      logoUrl: String(body.logoUrl ?? ""),
      websiteUrl: body.websiteUrl != null ? String(body.websiteUrl) : null,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
      active: body.active !== false,
    });

    await logAdminAction(auth.userId, "sponsor_logo.upsert", logo.id, { name: logo.name });
    return NextResponse.json({ ok: true, logo });
  }

  const highlights = Array.isArray(body.highlights)
    ? body.highlights.filter((h): h is string => typeof h === "string")
    : [];

  const offering = await upsertHostOfferingAdmin({
    type: body.type as HostOfferingType,
    title: String(body.title ?? ""),
    summary: String(body.summary ?? ""),
    body: body.body != null ? String(body.body) : null,
    highlights,
    active: body.active !== false,
  });

  await logAdminAction(auth.userId, "host_offering.upsert", offering.type, {
    id: offering.id,
  });

  return NextResponse.json({ ok: true, offering });
}

export async function DELETE(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const deleted = await deleteSponsorLogoAdmin(id);
  if (!deleted) {
    return NextResponse.json({ error: "Sponsor logo not found." }, { status: 404 });
  }

  await logAdminAction(auth.userId, "sponsor_logo.delete", id);
  return NextResponse.json({ ok: true });
}
