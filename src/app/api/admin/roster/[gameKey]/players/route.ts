import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import { addRosterPlayer, removeRosterPlayer } from "@roster-listings/index";
import { addRosterPlayerSchema } from "@roster-listings/domain/schemas";
import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ gameKey: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { gameKey } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addRosterPlayerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const result = await addRosterPlayer(gameKey, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "roster.player.add", gameKey, {
    userId: parsed.data.userId,
    username: parsed.data.username,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { gameKey } = await params;
  const playerId = req.nextUrl.searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "Player ID is required." }, { status: 400 });
  }

  const result = await removeRosterPlayer(gameKey, playerId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "roster.player.remove", gameKey, { playerId });

  return NextResponse.json({ ok: true });
}
