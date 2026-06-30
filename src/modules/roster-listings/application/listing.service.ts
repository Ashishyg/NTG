import { prisma } from "@core/database/client";
import type { ListingDetail, ListingPreview } from "@core/contracts/roster-listings";
import { rosterPresetLabel } from "@/lib/roster-games";
import { mapListingFormField } from "../domain/listing-form";
import type { ListingType } from "@prisma/client";

function mapListing(row: {
  id: string;
  slug: string;
  type: ListingType;
  title: string;
  description: string | null;
  gameKey: string | null;
  gameLabel: string | null;
  sortOrder: number;
}): ListingPreview {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    description: row.description,
    gameKey: row.gameKey,
    gameLabel: row.gameKey ? rosterPresetLabel(row.gameKey, row.gameLabel) : row.gameLabel,
    sortOrder: row.sortOrder,
  };
}

export async function listOpenListings(type?: ListingType): Promise<ListingPreview[]> {
  const rows = await prisma.listing.findMany({
    where: {
      status: "OPEN",
      ...(type ? { type } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(mapListing);
}

export async function getListingBySlug(
  slug: string,
  userId?: string | null,
): Promise<ListingDetail | null> {
  const row = await prisma.listing.findUnique({
    where: { slug },
    include: {
      formFields: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!row || row.status !== "OPEN") return null;

  let userApplied = false;
  let applicationStatus: string | null = null;

  if (userId) {
    const app = await prisma.listingApplication.findUnique({
      where: { listingId_userId: { listingId: row.id, userId } },
      select: { status: true },
    });
    if (app) {
      userApplied = true;
      applicationStatus = app.status;
    }
  }

  return {
    ...mapListing(row),
    userApplied,
    applicationStatus,
    formFields: row.formFields.map(mapListingFormField),
  };
}

export async function countOpenListings(): Promise<number> {
  return prisma.listing.count({ where: { status: "OPEN" } });
}
