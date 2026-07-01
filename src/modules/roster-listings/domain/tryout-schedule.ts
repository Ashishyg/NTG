import type { ListingStatus, ListingType } from "@prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TryoutScheduleFields = {
  type: ListingType;
  status: ListingStatus;
  autoManageTryout: boolean;
  tryoutOpensAt: Date | null;
  tryoutClosesAt: Date | null;
  tryoutOpenDays: number | null;
  tryoutRepeatDays: number | null;
};

export function resolveTryoutClosesAt(
  opensAt: Date | null,
  closesAt: Date | null,
  openDays: number | null,
): Date | null {
  if (closesAt) return closesAt;
  if (!opensAt || !openDays || openDays < 1) return null;
  return new Date(opensAt.getTime() + openDays * MS_PER_DAY);
}

export function tryoutWindowDurationMs(listing: TryoutScheduleFields): number | null {
  const closes = resolveTryoutClosesAt(
    listing.tryoutOpensAt,
    listing.tryoutClosesAt,
    listing.tryoutOpenDays,
  );
  if (!listing.tryoutOpensAt || !closes) return null;
  return closes.getTime() - listing.tryoutOpensAt.getTime();
}

/** Advance repeating windows until the current window is active or in the future. */
export function advanceTryoutWindow(
  listing: TryoutScheduleFields,
  now: Date = new Date(),
): { opensAt: Date; closesAt: Date } | null {
  if (!listing.tryoutOpensAt) return null;

  let opens = new Date(listing.tryoutOpensAt);
  const durationMs = tryoutWindowDurationMs(listing);
  if (!durationMs) return null;

  let closes = new Date(opens.getTime() + durationMs);
  const repeatDays = listing.tryoutRepeatDays;

  if (repeatDays && repeatDays > 0) {
    while (closes.getTime() <= now.getTime()) {
      opens = new Date(opens.getTime() + repeatDays * MS_PER_DAY);
      closes = new Date(opens.getTime() + durationMs);
    }
  }

  return { opensAt: opens, closesAt: closes };
}

export function isTryoutApplicationLive(
  listing: TryoutScheduleFields,
  now: Date = new Date(),
): boolean {
  if (listing.type !== "ROSTER_TRYOUT") {
    return listing.status === "OPEN";
  }

  if (!listing.autoManageTryout) {
    return listing.status === "OPEN";
  }

  const window = advanceTryoutWindow(listing, now);
  if (!window) return listing.status === "OPEN";

  const ts = now.getTime();
  return ts >= window.opensAt.getTime() && ts < window.closesAt.getTime();
}

export function computeTryoutListingStatus(
  listing: TryoutScheduleFields,
  now: Date = new Date(),
): ListingStatus | null {
  if (listing.type !== "ROSTER_TRYOUT" || !listing.autoManageTryout) return null;
  if (!listing.tryoutOpensAt) return null;
  if (!tryoutWindowDurationMs(listing)) return null;

  return isTryoutApplicationLive(listing, now) ? "OPEN" : "CLOSED";
}

export function validateTryoutSchedule(input: {
  tryoutOpensAt: Date | null;
  tryoutClosesAt: Date | null;
  tryoutOpenDays: number | null;
  autoManageTryout: boolean;
}): string | null {
  if (!input.autoManageTryout) return null;
  if (!input.tryoutOpensAt) {
    return "Set an opening date when auto-schedule is enabled.";
  }

  const closes = resolveTryoutClosesAt(
    input.tryoutOpensAt,
    input.tryoutClosesAt,
    input.tryoutOpenDays,
  );
  if (!closes) {
    return "Set how long tryouts stay open (days or a close date).";
  }
  if (closes.getTime() <= input.tryoutOpensAt.getTime()) {
    return "Close date must be after the opening date.";
  }
  return null;
}

export function formatTryoutSchedulePhase(
  listing: TryoutScheduleFields,
  now: Date = new Date(),
): "unscheduled" | "countdown" | "live" | "closed" {
  if (listing.type !== "ROSTER_TRYOUT" || !listing.tryoutOpensAt) return "unscheduled";

  const window = advanceTryoutWindow(listing, now);
  if (!window) return "unscheduled";

  const ts = now.getTime();
  if (ts < window.opensAt.getTime()) return "countdown";
  if (ts < window.closesAt.getTime()) return "live";
  return "closed";
}
