import { serverEnv } from "@core/config/env.server";
import { parseValorantActSeasonKey } from "@/lib/valorant-act";

export const SYNC_ACT_NOT_CONFIGURED =
  "Set VALORANT_CURRENT_ACT on Vercel (e.g. e11a3) before running rank sync.";

/** Current act from VALORANT_CURRENT_ACT env (Vercel production). */
export function getEnvValorantActKey(): string | null {
  const raw = serverEnv.valorantCurrentAct?.trim();
  if (!raw) return null;
  return parseValorantActSeasonKey(raw);
}

export function requireEnvValorantActKey(): string {
  const act = getEnvValorantActKey();
  if (!act) {
    throw new Error(SYNC_ACT_NOT_CONFIGURED);
  }
  return act;
}
