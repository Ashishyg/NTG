import { unstable_cache, revalidateTag } from "next/cache";
import type { ReelPreview } from "@core/contracts";
import { serverEnv } from "@core/config/env.server";
import { captionForReelId } from "@/lib/moments-reels";
import {
  localReelCoverPath,
  missingReelCoverIds,
  REEL_CACHE_TAG,
  syncReelCoversToDisk,
} from "./reel-cover-sync";

const FALLBACK_THUMB = "/images/reel-preview-fallback.svg";
const CACHE_REVALIDATE_SEC = 300; // 5 minutes

type OEmbedResponse = {
  title?: string;
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

function reelIdFromUrl(url: string): string {
  return url.match(/\/reel\/([^/?]+)/)?.[1] ?? url;
}

function normalizeReelUrl(url: string): string {
  const id = reelIdFromUrl(url);
  return `https://www.instagram.com/reel/${id}/`;
}

function cleanCaption(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

async function fetchOEmbedTitle(url: string): Promise<string | null> {
  try {
    const endpoint = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}&omitscript=true`;
    const res = await fetch(endpoint, { headers: FETCH_HEADERS });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("json")) return null;
    const data = (await res.json()) as OEmbedResponse;
    return cleanCaption(data.title);
  } catch {
    return null;
  }
}

async function resolveReelPreview(
  url: string,
  thumbOverride?: string,
  captionOverride?: string,
): Promise<ReelPreview> {
  const permalink = normalizeReelUrl(url);
  const id = reelIdFromUrl(permalink);

  // Only local static paths or explicit overrides — never hotlinked CDN URLs.
  const thumbnailUrl =
    thumbOverride ?? localReelCoverPath(id) ?? FALLBACK_THUMB;

  const oembedTitle = await fetchOEmbedTitle(permalink);
  const title =
    cleanCaption(captionOverride) ??
    cleanCaption(captionForReelId(id)) ??
    oembedTitle;

  return { id, permalink, thumbnailUrl, title };
}

async function resolveReelPreviewsUncached(
  urls: string[],
  thumbs: string[],
  captions: string[],
  limit: number,
): Promise<ReelPreview[]> {
  const slice = urls.slice(0, limit);
  return Promise.all(
    slice.map((url, i) =>
      resolveReelPreview(url, thumbs[i] || undefined, captions[i] || undefined),
    ),
  );
}

export async function getInstagramReelPreviews(limit = 3): Promise<ReelPreview[]> {
  const urls = serverEnv.instagramReelUrls;
  if (urls.length === 0) return [];

  // Download missing covers before cache read (fixes empty cache + fresh deploys).
  if (missingReelCoverIds(urls).length > 0) {
    await syncReelCoversToDisk(urls);
    revalidateTag(REEL_CACHE_TAG, "max");
  }

  const thumbs = serverEnv.instagramReelThumbnails;
  const captions = serverEnv.instagramReelCaptions;
  const cacheKey = `v9:${urls.join("|")}:${thumbs.join("|")}:${captions.join("|")}:${limit}`;

  return unstable_cache(
    () => resolveReelPreviewsUncached(urls, thumbs, captions, limit),
    ["instagram-reel-previews", cacheKey],
    { revalidate: CACHE_REVALIDATE_SEC, tags: [REEL_CACHE_TAG] },
  )();
}

/** Download reel covers to disk and bust gallery cache. */
export async function syncInstagramReelCovers(): Promise<{
  synced: number;
  failed: string[];
}> {
  const result = await syncReelCoversToDisk();
  revalidateTag(REEL_CACHE_TAG, "max");
  return { synced: result.synced.length, failed: result.failed };
}
