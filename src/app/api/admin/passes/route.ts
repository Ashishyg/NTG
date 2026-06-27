import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import {
  deleteGamepassPlanAdmin,
  listAllGamepassPlansAdmin,
  upsertGamepassPlanAdmin,
} from "@lounge-commerce/index";
import type { GamepassCategory } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const plans = await listAllGamepassPlansAdmin();
  return NextResponse.json({ plans });
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

  const plan = await upsertGamepassPlanAdmin({
    id: body.id ? String(body.id) : undefined,
    slug: String(body.slug ?? ""),
    category: body.category as GamepassCategory,
    title: String(body.title ?? ""),
    subtitle: body.subtitle != null ? String(body.subtitle) : null,
    description: body.description != null ? String(body.description) : null,
    priceDay: body.priceDay != null && body.priceDay !== "" ? Number(body.priceDay) : null,
    priceNight: body.priceNight != null && body.priceNight !== "" ? Number(body.priceNight) : null,
    priceSingle: body.priceSingle != null && body.priceSingle !== "" ? Number(body.priceSingle) : null,
    priceController:
      body.priceController != null && body.priceController !== ""
        ? Number(body.priceController)
        : null,
    validityText: body.validityText != null ? String(body.validityText) : null,
    timeWindowText: body.timeWindowText != null ? String(body.timeWindowText) : null,
    badge: body.badge != null ? String(body.badge) : null,
    featuredOnHome: Boolean(body.featuredOnHome),
    inquiryOnly: Boolean(body.inquiryOnly),
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
    active: body.active !== false,
    whatsappMessage: body.whatsappMessage != null ? String(body.whatsappMessage) : null,
  });

  await logAdminAction(auth.userId, "gamepass_plan.upsert", plan.slug, {
    id: plan.id,
    category: plan.category,
    featuredOnHome: plan.featuredOnHome,
  });

  return NextResponse.json({ ok: true, plan });
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

  const deleted = await deleteGamepassPlanAdmin(id);
  if (!deleted) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  await logAdminAction(auth.userId, "gamepass_plan.delete", id);
  return NextResponse.json({ ok: true });
}
