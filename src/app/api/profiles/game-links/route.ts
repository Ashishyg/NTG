import { linkGameIdentity } from "@auth-membership/index";
import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import type { GameSlug } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const validGames: GameSlug[] = ["VALORANT", "CS2", "EA_FC26", "OTHER"];

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  let body: { game?: string; platform?: string; externalId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.game || !body.platform || !body.externalId?.trim()) {
    return NextResponse.json({ error: "game, platform, and externalId are required." }, { status: 400 });
  }

  if (!validGames.includes(body.game as GameSlug)) {
    return NextResponse.json({ error: "Invalid game." }, { status: 400 });
  }

  const profile = await linkGameIdentity(auth.userId, {
    game: body.game as GameSlug,
    platform: body.platform,
    externalId: body.externalId.trim(),
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}
