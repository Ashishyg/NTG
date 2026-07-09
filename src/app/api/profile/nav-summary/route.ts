import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { resolvePortraitCardArtUrl } from "@/lib/valorant-player-card";
import { prisma } from "@core/database/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return "P";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function GET() {
  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      name: true,
      image: true,
      steamAvatarUrl: true,
      riotPlayerCard: true,
      riotPlayerCardWide: true,
      playerProfile: { select: { displayName: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const displayName =
    user.playerProfile?.displayName?.trim() || user.name?.trim() || "Player";
  const avatarUrl =
    resolvePortraitCardArtUrl(user.riotPlayerCard, user.riotPlayerCardWide) ||
    user.steamAvatarUrl ||
    user.image ||
    null;

  return NextResponse.json({
    displayName,
    avatarUrl,
    initials: initialsFromName(displayName),
  });
}
