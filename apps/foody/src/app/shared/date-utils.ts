/**
 * Value for an `<input type="datetime-local">`, which works with local time
 */
export function toDateTimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/**
 * PocketBase stores and compares dates in UTC as "YYYY-MM-DD HH:MM:SS.sssZ"
 */
export function toPocketBaseDate(date: Date): string {
  return date.toISOString().replace('T', ' ');
}

/**
 * PocketBase filter for all records whose `field` lies on the local day of `day`
 */
export function dayFilter(field: string, day = new Date()): string {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);

  return `${field} >= "${toPocketBaseDate(start)}" && ${field} < "${toPocketBaseDate(end)}"`;
}
