import { isCronAuthorized } from "@/lib/cron-auth";
import { serverEnv } from "@core/config/env.server";
import {
  syncAllLinkedPlayers,
  syncUserRank,
} from "@tournaments-leagues/index";
import { after, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** Allow ~55 users at 2.1s/call; continuation via `after()` if more remain. */
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!serverEnv.cronSecret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }

  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const userId = new URL(req.url).searchParams.get("userId");

  try {
    if (userId) {
      const result = await syncUserRank(userId);
      return NextResponse.json({
        ok: result.ok,
        ...(result.ok ? { synced: 1 } : { error: result.error }),
      });
    }

    const result = await syncAllLinkedPlayers({
      staleOnly: true,
      timeBudgetMs: 100_000,
    });

    if (result.hasMore) {
      after(async () => {
        let hasMore = true;
        while (hasMore) {
          const next = await syncAllLinkedPlayers({
            staleOnly: true,
            timeBudgetMs: 100_000,
          });
          hasMore = next.hasMore;
        }
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
