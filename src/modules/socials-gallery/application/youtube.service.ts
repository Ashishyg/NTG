import { unstable_cache } from "next/cache";
import type { YoutubePreview } from "@core/contracts";
import { serverEnv } from "@core/config/env.server";

function parseChannelIdFromUrl(url: string): string | null {
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (channelMatch) return channelMatch[1] ?? null;
  return null;
}

async function resolveChannelIdFromHandle(handle: string): Promise<string | null> {
  const clean = handle.replace(/^@/, "");
  try {
    const res = await fetch(`https://www.youtube.com/@${clean}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NTGBot/1.0)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/"externalId":"(UC[^"]+)"/) ??
      html.match(/"channelId":"(UC[^"]+)"/) ??
      html.match(/"browseId":"(UC[^"]+)"/) ??
      html.match(/channel_id=([^&"]+)/) ??
      html.match(/\/channel\/(UC[\w-]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function resolveYoutubeChannelId(): Promise<string | null> {
  if (serverEnv.youtubeChannelId) return serverEnv.youtubeChannelId;

  const url = serverEnv.youtubeChannelUrl;
  if (!url) return null;

  const fromUrl = parseChannelIdFromUrl(url);
  if (fromUrl) return fromUrl;

  const handleMatch = url.match(/youtube\.com\/@([\w.-]+)/i);
  if (handleMatch?.[1]) {
    return resolveChannelIdFromHandle(handleMatch[1]);
  }

  return null;
}

function parseLatestFromRss(xml: string): YoutubePreview | null {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entryMatch) return null;

  const entry = entryMatch[1];
  const videoId =
    entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ??
    entry.match(/<id>yt:video:([^<]+)<\/id>/)?.[1];
  if (!videoId) return null;

  const title = entry.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? "Latest from NTG Lounge";
  const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? null;

  return {
    videoId,
    title: decodeXmlEntities(title),
    permalink: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    publishedAt,
  };
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchYoutubeLatestUncached(): Promise<YoutubePreview | null> {
  const channelId = await resolveYoutubeChannelId();
  if (!channelId) return null;

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl, { next: { revalidate: 1800 } });
  if (!res.ok) return null;

  const xml = await res.text();
  const preview = parseLatestFromRss(xml);
  if (!preview) return null;

  return preview;
}

export async function getYoutubeLatestPreview(): Promise<YoutubePreview | null> {
  if (!serverEnv.youtubeChannelId && !serverEnv.youtubeChannelUrl) {
    return null;
  }

  const cacheKey = `v2:${serverEnv.youtubeChannelId ?? ""}:${serverEnv.youtubeChannelUrl ?? ""}`;

  return unstable_cache(
    () => fetchYoutubeLatestUncached(),
    ["youtube-latest-preview", cacheKey],
    { revalidate: 1800 },
  )();
}
