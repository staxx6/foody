import { DateRange } from '@foody/pocketbase-access';

/**
 * Local day as value for an `<input type="date">`
 */
export function toDateInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Local time as value for an `<input type="time">`
 */
export function toTimeInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(11, 16);
}

/**
 * The point in time of the values of a date and a time input
 */
export function fromDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
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
