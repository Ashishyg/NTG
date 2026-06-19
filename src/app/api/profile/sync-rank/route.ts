import { getSession } from "@core/auth/session";
import { syncUserRank } from "@tournaments-leagues/index";
import { getPlayerGameProfile } from "@auth-membership/application/game-profile.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getPlayerGameProfile(session.user.id);
    if (!profile?.riotPuuid) {
      return NextResponse.json({ error: "Link your Riot ID first." }, { status: 400 });
    }

    const result = await syncUserRank(session.user.id, {
      tryAllRegions: true,
      context: { source: "profile" },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updated = await getPlayerGameProfile(session.user.id);
    return NextResponse.json({
      ok: true,
      profile: updated,
    });
  } catch (err) {
    console.error("[profile/sync-rank]", err);
    return NextResponse.json({ error: "Could not refresh rank." }, { status: 500 });
  }
}
