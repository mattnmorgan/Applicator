/** Left-pad a number with zeros to the given width (default 2). */
export function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** Convert a kebab-case string to camelCase. */
export function toCamelCase(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
