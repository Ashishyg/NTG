import type { GamepassCategory } from "@prisma/client";

import { prisma } from "@core/database/client";

import {
  MAX_FEATURED_PER_CATEGORY,
  type GamepassPlanView,
  type UpsertGamepassPlanInput,
} from "../domain/types";

function toView(row: {
  id: string;
  slug: string;
  category: GamepassCategory;
  title: string;
  subtitle: string | null;
  description: string | null;
  priceDay: number | null;
  priceNight: number | null;
  priceSingle: number | null;
  priceController: number | null;
  validityText: string | null;
  timeWindowText: string | null;
  badge: string | null;
  featuredOnHome: boolean;
  inquiryOnly: boolean;
  sortOrder: number;
  active: boolean;
  whatsappMessage: string | null;
}): GamepassPlanView {
  return { ...row };
}

export async function listActiveGamepassPlans(
  category?: GamepassCategory,
): Promise<GamepassPlanView[]> {
  const rows = await prisma.gamepassPlan.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map(toView);
}

export async function listFeaturedGamepassPlans(
  category: GamepassCategory,
): Promise<GamepassPlanView[]> {
  const rows = await prisma.gamepassPlan.findMany({
    where: { active: true, category, featuredOnHome: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    take: MAX_FEATURED_PER_CATEGORY,
  });
  return rows.map(toView);
}

export async function listAllGamepassPlansAdmin(): Promise<GamepassPlanView[]> {
  const rows = await prisma.gamepassPlan.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map(toView);
}

async function enforceFeaturedLimit(
  category: GamepassCategory,
  planId: string,
): Promise<void> {
  const featured = await prisma.gamepassPlan.findMany({
    where: { category, featuredOnHome: true, active: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  if (featured.length <= MAX_FEATURED_PER_CATEGORY) return;

  const toDemote = featured
    .filter((p) => p.id !== planId)
    .slice(MAX_FEATURED_PER_CATEGORY);

  if (toDemote.length === 0) return;

  await prisma.gamepassPlan.updateMany({
    where: { id: { in: toDemote.map((p) => p.id) } },
    data: { featuredOnHome: false },
  });
}

export async function upsertGamepassPlanAdmin(
  input: UpsertGamepassPlanInput,
): Promise<GamepassPlanView> {
  const data = {
    slug: input.slug.trim(),
    category: input.category,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    description: input.description?.trim() || null,
    priceDay: input.priceDay ?? null,
    priceNight: input.priceNight ?? null,
    priceSingle: input.priceSingle ?? null,
    priceController: input.priceController ?? null,
    validityText: input.validityText?.trim() || null,
    timeWindowText: input.timeWindowText?.trim() || null,
    badge: input.badge?.trim() || null,
    featuredOnHome: input.featuredOnHome ?? false,
    inquiryOnly: input.inquiryOnly ?? false,
    sortOrder: input.sortOrder ?? 0,
    active: input.active ?? true,
    whatsappMessage: input.whatsappMessage?.trim() || null,
  };

  const row = input.id
    ? await prisma.gamepassPlan.update({ where: { id: input.id }, data })
    : await prisma.gamepassPlan.create({ data });

  if (row.featuredOnHome) {
    await enforceFeaturedLimit(row.category, row.id);
  }

  return toView(row);
}

export async function deleteGamepassPlanAdmin(id: string): Promise<boolean> {
  const deleted = await prisma.gamepassPlan.deleteMany({ where: { id } });
  return deleted.count > 0;
}
