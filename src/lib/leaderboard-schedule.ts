/** IST = UTC+5:30 (no DST). */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Production daily cron: 2:30 AM IST (Vercel `0 21 * * *` UTC). */
const DAILY_REFRESH_HOUR_IST = 2;
const DAILY_REFRESH_MINUTE_IST = 30;

/** Staging hourly cron: :50 each hour IST. */
const HOURLY_REFRESH_MINUTE_IST = 50;

function istWallClock(now: Date) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function fromIstWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): Date {
  return new Date(Date.UTC(year, month, day, hour, minute, second, 0) - IST_OFFSET_MS);
}

export function getNextDailyRefreshAt(now = new Date()): Date {
  const ist = istWallClock(now);
  const pastTodaySlot =
    ist.hour > DAILY_REFRESH_HOUR_IST ||
    (ist.hour === DAILY_REFRESH_HOUR_IST && ist.minute >= DAILY_REFRESH_MINUTE_IST);

  if (!pastTodaySlot) {
    return fromIstWallClock(
      ist.year,
      ist.month,
      ist.day,
      DAILY_REFRESH_HOUR_IST,
      DAILY_REFRESH_MINUTE_IST,
    );
  }

  const tomorrow = new Date(Date.UTC(ist.year, ist.month, ist.day + 1));
  return fromIstWallClock(
    tomorrow.getUTCFullYear(),
    tomorrow.getUTCMonth(),
    tomorrow.getUTCDate(),
    DAILY_REFRESH_HOUR_IST,
    DAILY_REFRESH_MINUTE_IST,
  );
}

export function getNextHourlyRefreshAt(now = new Date()): Date {
  const ist = istWallClock(now);

  if (ist.minute < HOURLY_REFRESH_MINUTE_IST) {
    return fromIstWallClock(ist.year, ist.month, ist.day, ist.hour, HOURLY_REFRESH_MINUTE_IST);
  }

  const nextHour = new Date(Date.UTC(ist.year, ist.month, ist.day, ist.hour + 1));
  return fromIstWallClock(
    nextHour.getUTCFullYear(),
    nextHour.getUTCMonth(),
    nextHour.getUTCDate(),
    nextHour.getUTCHours(),
    HOURLY_REFRESH_MINUTE_IST,
  );
}

export function msUntilNextRefresh(
  hourly: boolean,
  now = new Date(),
): number {
  const next = hourly ? getNextHourlyRefreshAt(now) : getNextDailyRefreshAt(now);
  return Math.max(0, next.getTime() - now.getTime());
}
