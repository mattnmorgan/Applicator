import { pad } from "./string";

/** Return a new Date shifted by `days` UTC days. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Return a new Date shifted by `months` UTC months. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Return midnight UTC on the given date. */
export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Return the Sunday that starts the week containing `date` (UTC). */
export function getWeekStart(date: Date): Date {
  const d = startOfDayUTC(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

/** Format a Date as `YYYY-MM-DD` (UTC). */
export function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Format an ISO string for human display.
 * - `allDay`: returns a date-only string (e.g. "Mon, Jan 1, 2024").
 * - Otherwise: returns date + time (e.g. "Mon, Jan 1, 2024, 9:00 AM").
 */
export function formatDatetime(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  if (allDay) {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Parse a `YYYY-MM-DD` string as midnight UTC. */
export function parseDate(s: string): Date {
  return new Date(s + "T00:00:00Z");
}

/** Return the first day of the month containing `date` (UTC). */
export function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Return true if `a` and `b` fall on the same UTC calendar day. */
export function sameDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();
}

/** Format an ISO string as a locale time string (e.g. "9:00 AM"). */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Return the short day name and day-of-month number for a UTC date. */
export function formatDayHeader(date: Date): { dayNum: string; dayName: string } {
  return {
    dayNum: String(date.getUTCDate()),
    dayName: date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
  };
}

/**
 * Return a human-readable elapsed-time string relative to `date`
 * (e.g. "Just now", "5m ago", "2h ago"). Returns `""` when `date` is null.
 */
export function getTimeSinceRefresh(date: Date | null): string {
  if (!date) return "";
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
