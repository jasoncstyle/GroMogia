export const SCHEDULE_FREQUENCIES = ["off", "daily", "weekly"] as const;

export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

/** Daily Vercel Cron tick. Hobby plans allow one cron per day. */
export const SCHEDULE_TICK_HOUR_UTC = 12;
export const SCHEDULE_TICK_MINUTE_UTC = 15;

export function isScheduleFrequency(value: unknown): value is ScheduleFrequency {
  return value === "off" || value === "daily" || value === "weekly";
}

export function nextRunAt(
  frequency: ScheduleFrequency,
  from = new Date(),
): Date | null {
  if (frequency === "off") return null;
  return nextTickUtc(from);
}

export function nextRunAfterSuccess(
  frequency: ScheduleFrequency,
  finishedAt = new Date(),
): Date | null {
  if (frequency === "off") return null;
  const days = frequency === "weekly" ? 7 : 1;
  const later = new Date(finishedAt);
  later.setUTCDate(later.getUTCDate() + days);
  const snapped = tickOn(later);
  if (snapped.getTime() <= finishedAt.getTime()) {
    snapped.setUTCDate(snapped.getUTCDate() + 1);
  }
  return snapped;
}

export function isDue(
  frequency: ScheduleFrequency,
  next: Date | null | undefined,
  now = new Date(),
): boolean {
  if (frequency === "off" || !next) return false;
  return next.getTime() <= now.getTime();
}

export function describeFrequency(frequency: ScheduleFrequency): string {
  if (frequency === "daily") return "Every day";
  if (frequency === "weekly") return "Every week";
  return "Manual only";
}

function tickOn(date: Date): Date {
  const tick = new Date(date);
  tick.setUTCHours(SCHEDULE_TICK_HOUR_UTC, SCHEDULE_TICK_MINUTE_UTC, 0, 0);
  return tick;
}

function nextTickUtc(from: Date): Date {
  const tick = tickOn(from);
  if (tick.getTime() <= from.getTime()) {
    tick.setUTCDate(tick.getUTCDate() + 1);
  }
  return tick;
}
