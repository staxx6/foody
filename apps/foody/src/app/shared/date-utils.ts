import { DateRange } from '@foody/pocketbase-access';

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
 * The local day of `day` as date range of `field`
 */
export function dayRange(field: string, day = new Date()): DateRange {
  return {
    field,
    from: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
    to: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1),
  };
}
