/**
 * Convert epoch milliseconds to a datetime-local input value string.
 * Uses LOCAL timezone (not UTC) -- critical for correct time picker display.
 * See RESEARCH.md Pitfall 1: timezone offset in datetime-local.
 */
export function epochToDatetimeLocal(epochMs: number): string {
  const d = new Date(epochMs);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(epochMs - offset).toISOString().slice(0, 16);
}

/**
 * Convert a datetime-local input value string back to epoch milliseconds.
 */
export function datetimeLocalToEpoch(value: string): number {
  return new Date(value).getTime();
}
