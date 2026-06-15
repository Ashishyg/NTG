import { prisma } from "@core/database/client";
import type { FeaturedDeck, GalleryPreview, MomentsGallery } from "@core/contracts";
import { loungeFeaturedDeck } from "@/lib/moments-featured";
import { getInstagramReelPreviews } from "./instagram.service";
import { getYoutubeLatestPreview } from "./youtube.service";

export function getFeaturedDeck(): FeaturedDeck {
  return loungeFeaturedDeck;
}

export async function getMomentsGallery(): Promise<MomentsGallery> {
  const [reels, youtube] = await Promise.all([
    getInstagramReelPreviews(3),
    getYoutubeLatestPreview(),
  ]);

  return {
    featured: getFeaturedDeck(),
    reels,
    youtube,
  };
}

// Legacy — kept for landing-home preview and /api/gallery
export async function getGalleryPreview(limit = 6): Promise<GalleryPreview> {
  const items = await prisma.galleryItem.findMany({
    where: { source: { active: true } },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: limit,
    include: { source: true },
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      platform: item.source.platform,
      mediaType: item.mediaType,
      embedUrl: item.embedUrl,
      thumbnailUrl: item.thumbnailUrl,
      caption: item.caption,
      publishedAt: item.publishedAt?.toISOString() ?? null,
    })),
  };
}
