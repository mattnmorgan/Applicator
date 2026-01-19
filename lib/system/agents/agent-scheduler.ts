import { isValidCronString } from "@/lib/system/installation/package-validator";

/**
 * Parse a CRON field and return the possible values
 */
function parseCronField(
  field: string,
  min: number,
  max: number
): number[] {
  const values: number[] = [];

  // Handle wildcard
  if (field === "*") {
    for (let i = min; i <= max; i++) {
      values.push(i);
    }
    return values;
  }

  // Handle step values (e.g., */5, 1-10/2)
  const stepMatch = field.match(/^(.+)\/(\d+)$/);
  if (stepMatch) {
    const base = stepMatch[1];
    const step = parseInt(stepMatch[2], 10);
    const baseValues =
      base === "*"
        ? Array.from({ length: max - min + 1 }, (_, i) => min + i)
        : parseCronField(base, min, max);

    for (let i = 0; i < baseValues.length; i += step) {
      values.push(baseValues[i]);
    }
    return values;
  }

  // Handle list values (e.g., 1,3,5)
  if (field.includes(",")) {
    for (const part of field.split(",")) {
      values.push(...parseCronField(part, min, max));
    }
    return [...new Set(values)].sort((a, b) => a - b);
  }

  // Handle range values (e.g., 1-5)
  const rangeMatch = field.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    for (let i = start; i <= end; i++) {
      values.push(i);
    }
    return values;
  }

  // Handle single numeric value
  const num = parseInt(field, 10);
  if (!isNaN(num)) {
    values.push(num);
  }

  return values;
}

/**
 * Parse a CRON string into its component parts
 */
export function parseCronString(cronString: string): {
  seconds?: number[];
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
} | null {
  if (!isValidCronString(cronString)) {
    return null;
  }

  const parts = cronString.trim().split(/\s+/);
  const hasSecs = parts.length === 6;

  if (hasSecs) {
    return {
      seconds: parseCronField(parts[0], 0, 59),
      minutes: parseCronField(parts[1], 0, 59),
      hours: parseCronField(parts[2], 0, 23),
      daysOfMonth: parseCronField(parts[3], 1, 31),
      months: parseCronField(parts[4], 1, 12),
      daysOfWeek: parseCronField(parts[5], 0, 7).map((d) => (d === 7 ? 0 : d)),
    };
  }

  return {
    minutes: parseCronField(parts[0], 0, 59),
    hours: parseCronField(parts[1], 0, 23),
    daysOfMonth: parseCronField(parts[2], 1, 31),
    months: parseCronField(parts[3], 1, 12),
    daysOfWeek: parseCronField(parts[4], 0, 7).map((d) => (d === 7 ? 0 : d)),
  };
}

/**
 * Get the next execution time for a CRON schedule
 */
export function getNextCronExecution(
  cronString: string,
  fromDate: Date = new Date()
): Date | null {
  const parsed = parseCronString(cronString);
  if (!parsed) {
    return null;
  }

  const hasSeconds = parsed.seconds !== undefined;
  const maxIterations = 366 * 24 * 60; // Max ~1 year of minutes
  let iterations = 0;

  // Start from the next second/minute
  const next = new Date(fromDate);
  if (hasSeconds) {
    next.setSeconds(next.getSeconds() + 1);
    next.setMilliseconds(0);
  } else {
    next.setMinutes(next.getMinutes() + 1);
    next.setSeconds(0);
    next.setMilliseconds(0);
  }

  while (iterations < maxIterations) {
    iterations++;

    // Check month
    if (!parsed.months.includes(next.getMonth() + 1)) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Check day of month and day of week
    const dayOfMonth = next.getDate();
    const dayOfWeek = next.getDay();
    const dayOfMonthMatch = parsed.daysOfMonth.includes(dayOfMonth);
    const dayOfWeekMatch = parsed.daysOfWeek.includes(dayOfWeek);

    // Day matching: both must match OR one is * (all values)
    const domIsWildcard = parsed.daysOfMonth.length === 31;
    const dowIsWildcard = parsed.daysOfWeek.length === 7;

    const dayMatch =
      (domIsWildcard && dayOfWeekMatch) ||
      (dowIsWildcard && dayOfMonthMatch) ||
      (dayOfMonthMatch && dayOfWeekMatch);

    if (!dayMatch) {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Check hour
    if (!parsed.hours.includes(next.getHours())) {
      const nextHour = parsed.hours.find((h) => h > next.getHours());
      if (nextHour !== undefined) {
        next.setHours(nextHour, 0, 0, 0);
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
      }
      continue;
    }

    // Check minute
    if (!parsed.minutes.includes(next.getMinutes())) {
      const nextMinute = parsed.minutes.find((m) => m > next.getMinutes());
      if (nextMinute !== undefined) {
        next.setMinutes(nextMinute, 0, 0);
      } else {
        next.setHours(next.getHours() + 1, 0, 0, 0);
      }
      continue;
    }

    // Check second (if applicable)
    if (hasSeconds && !parsed.seconds!.includes(next.getSeconds())) {
      const nextSecond = parsed.seconds!.find((s) => s > next.getSeconds());
      if (nextSecond !== undefined) {
        next.setSeconds(nextSecond, 0);
      } else {
        next.setMinutes(next.getMinutes() + 1, 0, 0);
      }
      continue;
    }

    // All conditions match
    return next;
  }

  return null;
}

/**
 * Format a date as a human-readable relative time string
 */
export function formatNextExecution(date: Date | null): string {
  if (!date) {
    return "Never";
  }

  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) {
    return "Overdue";
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `in ${days} day${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  }
  if (minutes > 0) {
    return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `in ${seconds} second${seconds !== 1 ? "s" : ""}`;
}

/**
 * Check if the current time matches a CRON schedule
 */
export function matchesCronSchedule(cronString: string, date: Date = new Date()): boolean {
  const parsed = parseCronString(cronString);
  if (!parsed) {
    return false;
  }

  const hasSeconds = parsed.seconds !== undefined;

  // Check all components
  if (!parsed.months.includes(date.getMonth() + 1)) return false;
  if (!parsed.hours.includes(date.getHours())) return false;
  if (!parsed.minutes.includes(date.getMinutes())) return false;
  if (hasSeconds && !parsed.seconds!.includes(date.getSeconds())) return false;

  // Check day (day of month OR day of week)
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay();
  const domMatch = parsed.daysOfMonth.includes(dayOfMonth);
  const dowMatch = parsed.daysOfWeek.includes(dayOfWeek);
  const domIsWildcard = parsed.daysOfMonth.length === 31;
  const dowIsWildcard = parsed.daysOfWeek.length === 7;

  return (
    (domIsWildcard && dowMatch) ||
    (dowIsWildcard && domMatch) ||
    (domMatch && dowMatch)
  );
}
