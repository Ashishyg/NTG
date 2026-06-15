import fs from "fs";
import path from "path";
import { serverEnv } from "@core/config/env.server";

export const REEL_COVERS_DIR = path.join(process.cwd(), "public", "covers", "reels");
export const REEL_COVERS_LEGACY_DIR = path.join(process.cwd(), "public", "moments", "reels");
export const REEL_COVERS_PUBLIC_PREFIX = "/covers/reels";
export const REEL_COVERS_LEGACY_PREFIX = "/moments/reels";
export const REEL_CACHE_TAG = "instagram-reel-previews";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "image/*",
};

export type ReelCoverSyncItem = {
  id: string;
  permalink: string;
  localPath: string;
  bytes: number;
};

export type ReelCoverSyncResult = {
  synced: ReelCoverSyncItem[];
  failed: string[];
};

function reelIdFromUrl(url: string): string {
  return url.match(/\/reel\/([^/?]+)/)?.[1] ?? url;
}

function normalizeReelUrl(url: string): string {
  const id = reelIdFromUrl(url);
  return `https://www.instagram.com/reel/${id}/`;
}

async function fetchCdnCoverUrl(shortcode: string): Promise<string | null> {
  const res = await fetch(`https://www.instagram.com/p/${shortcode}/media/?size=l`, {
    headers: FETCH_HEADERS,
    redirect: "manual",
  });
  const location = res.headers.get("location");
  if ((res.status === 301 || res.status === 302) && location?.startsWith("http")) {
    return location;
  }
  return null;
}

/** Permanent local path for a reel shortcode, if file exists. */
export function localReelCoverPath(shortcode: string): string | null {
  const dirs: Array<{ dir: string; prefix: string }> = [
    { dir: REEL_COVERS_DIR, prefix: REEL_COVERS_PUBLIC_PREFIX },
    { dir: REEL_COVERS_LEGACY_DIR, prefix: REEL_COVERS_LEGACY_PREFIX },
  ];

  for (const { dir, prefix } of dirs) {
    for (const ext of [".jpg", ".jpeg", ".webp", ".png"]) {
      const file = path.join(dir, `${shortcode}${ext}`);
      if (fs.existsSync(file)) return `${prefix}/${shortcode}${ext}`;
    }
  }
  return null;
}

/** True when any configured reel is missing a local cover file. */
export function missingReelCoverIds(urls = serverEnv.instagramReelUrls): string[] {
  return urls
    .map((url) => reelIdFromUrl(normalizeReelUrl(url)))
    .filter((id) => id && !localReelCoverPath(id)) as string[];
}

/**
 * Downloads Instagram reel cover images to public/covers/reels/{id}.jpg.
 * Never persists CDN URLs — only local static paths are returned.
 */
export async function syncReelCoversToDisk(
  urls = serverEnv.instagramReelUrls,
): Promise<ReelCoverSyncResult> {
  const synced: ReelCoverSyncItem[] = [];
  const failed: string[] = [];

  fs.mkdirSync(REEL_COVERS_DIR, { recursive: true });

  for (const rawUrl of urls) {
    const permalink = normalizeReelUrl(rawUrl);
    const id = reelIdFromUrl(permalink);
    if (!id) {
      failed.push(rawUrl);
      continue;
    }

    try {
      const cdnUrl = await fetchCdnCoverUrl(id);
      if (!cdnUrl) {
        failed.push(id);
        continue;
      }

      const imgRes = await fetch(cdnUrl, { headers: FETCH_HEADERS });
      if (!imgRes.ok) {
        failed.push(id);
        continue;
      }

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const outFile = path.join(REEL_COVERS_DIR, `${id}.jpg`);
      fs.writeFileSync(outFile, buffer);

      synced.push({
        id,
        permalink,
        localPath: `${REEL_COVERS_PUBLIC_PREFIX}/${id}.jpg`,
        bytes: buffer.length,
      });
    } catch {
      failed.push(id);
    }
  }

  return { synced, failed };
}
