import type { HostOfferingType } from "@prisma/client";

import { prisma } from "@core/database/client";

import type {
  HostOfferingView,
  SponsorLogoView,
  UpsertHostOfferingInput,
  UpsertSponsorLogoInput,
} from "../domain/types";

function parseHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toOfferingView(row: {
  id: string;
  type: HostOfferingType;
  title: string;
  summary: string;
  body: string | null;
  highlights: unknown;
  active: boolean;
}): HostOfferingView {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    body: row.body,
    highlights: parseHighlights(row.highlights),
    active: row.active,
  };
}

function toSponsorView(row: {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  sortOrder: number;
  active: boolean;
}): SponsorLogoView {
  return { ...row };
}

export async function listActiveHostOfferings(): Promise<HostOfferingView[]> {
  const rows = await prisma.hostOffering.findMany({
    where: { active: true },
    orderBy: { type: "asc" },
  });
  return rows.map(toOfferingView);
}

export async function getHostOfferingByType(
  type: HostOfferingType,
): Promise<HostOfferingView | null> {
  const row = await prisma.hostOffering.findUnique({ where: { type } });
  return row ? toOfferingView(row) : null;
}

export async function listAllHostOfferingsAdmin(): Promise<HostOfferingView[]> {
  const rows = await prisma.hostOffering.findMany({ orderBy: { type: "asc" } });
  return rows.map(toOfferingView);
}

export async function upsertHostOfferingAdmin(
  input: UpsertHostOfferingInput,
): Promise<HostOfferingView> {
  const row = await prisma.hostOffering.upsert({
    where: { type: input.type },
    create: {
      type: input.type,
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body?.trim() || null,
      highlights: input.highlights ?? [],
      active: input.active ?? true,
    },
    update: {
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body?.trim() || null,
      highlights: input.highlights ?? [],
      active: input.active ?? true,
    },
  });
  return toOfferingView(row);
}

export async function listActiveSponsorLogos(): Promise<SponsorLogoView[]> {
  const rows = await prisma.sponsorLogo.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toSponsorView);
}

export async function listAllSponsorLogosAdmin(): Promise<SponsorLogoView[]> {
  const rows = await prisma.sponsorLogo.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toSponsorView);
}

export async function upsertSponsorLogoAdmin(
  input: UpsertSponsorLogoInput,
): Promise<SponsorLogoView> {
  const data = {
    name: input.name.trim(),
    logoUrl: input.logoUrl.trim(),
    websiteUrl: input.websiteUrl?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
    active: input.active ?? true,
  };

  const row = input.id
    ? await prisma.sponsorLogo.update({ where: { id: input.id }, data })
    : await prisma.sponsorLogo.create({ data });

  return toSponsorView(row);
}

export async function deleteSponsorLogoAdmin(id: string): Promise<boolean> {
  const deleted = await prisma.sponsorLogo.deleteMany({ where: { id } });
  return deleted.count > 0;
}
