import { serverEnv } from "@core/config/env.server";
import { henrikFetch, henrikHeaders } from "@/lib/henrik-client";

export type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
  region?: string;
};

export function parseRiotId(riotId: string): { gameName: string; tagLine: string } | null {
  const idx = riotId.lastIndexOf("#");
  if (idx <= 0) return null;
  const gameName = riotId.slice(0, idx).trim();
  const tagLine = riotId.slice(idx + 1).trim();
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}

export async function resolveRiotAccount(
  gameName: string,
  tagLine: string,
): Promise<RiotAccount | null> {
  const apiKey = serverEnv.henrikdevApiKey;

  if (!apiKey && process.env.NODE_ENV === "development") {
    return {
      puuid: `dev-${gameName.toLowerCase()}-${tagLine.toLowerCase()}`,
      gameName,
      tagLine,
      region: "ap",
    };
  }

  const encodedName = encodeURIComponent(gameName);
  const encodedTag = encodeURIComponent(tagLine);

  const res = await henrikFetch(
    `https://api.henrikdev.xyz/valorant/v1/account/${encodedName}/${encodedTag}`,
    { headers: henrikHeaders(), next: { revalidate: 0 } },
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Riot lookup failed (${res.status})`);
  }

  const data = (await res.json()) as {
    data?: { puuid?: string; game_name?: string; tag_line?: string; region?: string };
  };

  const puuid = data.data?.puuid;
  if (!puuid) return null;

  return {
    puuid,
    gameName: data.data?.game_name ?? gameName,
    tagLine: data.data?.tag_line ?? tagLine,
    region: data.data?.region,
  };
}
