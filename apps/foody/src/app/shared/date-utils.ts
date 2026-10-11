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
 * The point in time of a date as PocketBase stores it
 */
export function fromPocketBaseDate(value: string): Date {
  return new Date(value.replace(' ', 'T'));
}

/**
 * PocketBase stores and compares dates in UTC as "YYYY-MM-DD HH:MM:SS.sssZ"
 */
export function toPocketBaseDate(date: Date): string {
  return date.toISOString().replace('T', ' ');
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The first day of the month that many months later (or earlier) */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** The time from one point in time to another, as hours and minutes */
export function elapsed(
  from: Date,
  to: Date,
): { hours: number; minutes: number } {
  const minutes = Math.round((to.getTime() - from.getTime()) / 60_000);
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** Identifies the local day of a point in time, e.g. "2026-10-11" */
export function dayKey(date: Date): string {
  return toDateInputValue(date);
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

/**
 * The month of `month` in local time as date range of `field`
 */
export function monthRange(field: string, month: Date): DateRange {
  return { field, from: startOfMonth(month), to: addMonths(month, 1) };
}
