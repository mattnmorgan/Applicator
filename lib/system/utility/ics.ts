/**
 * Escape special characters in an ICS property value per RFC 5545.
 */
export function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Fold a long ICS line at 75 octets per RFC 5545 §3.1.
 * Continuation lines begin with a single space.
 */
export function icsFoldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

/**
 * Format an ISO string as an ICS date or datetime value.
 * - `allDay = true`  → `YYYYMMDD` (use with `VALUE=DATE`)
 * - `allDay = false` → `YYYYMMDDTHHmmssZ` (UTC datetime)
 */
export function icsDate(isoStr: string, allDay: boolean): string {
  const d = new Date(isoStr);
  const y = String(d.getUTCFullYear());
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dy = String(d.getUTCDate()).padStart(2, "0");
  if (allDay) return `${y}${mo}${dy}`;
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${dy}T${h}${mi}${s}Z`;
}

/**
 * Return the current UTC moment formatted as an ICS DTSTAMP value (`YYYYMMDDTHHmmssZ`).
 */
export function icsStamp(): string {
  return icsDate(new Date().toISOString(), false);
}

/**
 * Unescape special characters in an ICS property value per RFC 5545.
 * Inverse of `icsEscape`.
 */
export function icsUnescape(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\;/g, ";")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\");
}

/**
 * Parse an ICS date or datetime value into an ISO 8601 string.
 * - All-day (`VALUE=DATE`): `YYYYMMDD` → `YYYY-MM-DDT00:00:00.000Z`
 * - Timed (UTC): `YYYYMMDDTHHmmssZ` → full ISO string
 * Returns `null` if the value is absent or cannot be parsed.
 */
export function parseICSDate(val: string | undefined, allDay: boolean): string | null {
  if (!val) return null;
  try {
    if (allDay) {
      return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}T00:00:00.000Z`;
    }
    const y = val.slice(0, 4), mo = val.slice(4, 6), d = val.slice(6, 8);
    const h = val.slice(9, 11), mn = val.slice(11, 13), s = val.slice(13, 15);
    return new Date(`${y}-${mo}-${d}T${h}:${mn}:${s}Z`).toISOString();
  } catch {
    return null;
  }
}
