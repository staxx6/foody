import { computed, effect, inject, Injectable } from '@angular/core';
import { SettingsStore } from '../settings-store';
import { Language, TRANSLATIONS } from './translations';

/**
 * A name from the database with its optional translations (fields `name`,
 * `name_de` and `name_en`), as used by the reference data like units
 */
export type LocalizedName = { name: string; nameDe: string; nameEn: string };

export function toLocalizedName(
  record: Record<string, unknown>,
): LocalizedName {
  return {
    name: String(record['name'] ?? ''),
    nameDe: String(record['name_de'] ?? ''),
    nameEn: String(record['name_en'] ?? ''),
  };
}

/**
 * Texts of the user interface in the language chosen in the settings.
 * Components read them with `t().key`, so they follow a change at once.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly settings = inject(SettingsStore);

  readonly language = computed<Language>(() => {
    const language = this.settings.language();
    if (language !== 'system') return language;
    return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
  });

  readonly t = computed(() => TRANSLATIONS[this.language()]);

  constructor() {
    effect(() => (document.documentElement.lang = this.language()));
  }

  /** The translation of a name, or the name itself if there is none */
  name(names: LocalizedName | null | undefined): string {
    if (!names) return '';
    const translated = this.language() === 'de' ? names.nameDe : names.nameEn;
    return translated || names.name;
  }

  /** e.g. "Sunday, 11 October" */
  formatDay(date: Date): string {
    return new Intl.DateTimeFormat(this.language(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }

  /** e.g. "Sunday" */
  formatWeekday(date: Date): string {
    return new Intl.DateTimeFormat(this.language(), { weekday: 'long' }).format(
      date,
    );
  }

  /** e.g. "11 October 2026" */
  formatFullDate(date: Date): string {
    return new Intl.DateTimeFormat(this.language(), {
      dateStyle: 'long',
    }).format(date);
  }

  /** e.g. "October 2026" */
  formatMonth(date: Date): string {
    return new Intl.DateTimeFormat(this.language(), {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  /** The short names of the weekdays, starting with Monday */
  weekdayNames(): string[] {
    const format = new Intl.DateTimeFormat(this.language(), {
      weekday: 'short',
    });
    // 5 January 2026 is a Monday
    return Array.from({ length: 7 }, (_, day) =>
      format.format(new Date(2026, 0, 5 + day)),
    );
  }

  /** The short names of the months, starting with January */
  monthNames(): string[] {
    const format = new Intl.DateTimeFormat(this.language(), { month: 'short' });
    return Array.from({ length: 12 }, (_, month) =>
      format.format(new Date(2026, month, 1)),
    );
  }

  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat(this.language(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}
