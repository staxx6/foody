import { inject, Injectable, signal } from '@angular/core';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';
import { fromPocketBaseDate, monthRange } from '../shared/date-utils';

export type MonthSymptomEntry = {
  date: Date;
  symptomId: string;
  symptomName: string;
  /** Discomfort level 1-100, null if none was entered */
  level: number | null;
};

/**
 * What was logged in a month, as far as the calendar needs it
 */
@Injectable({ providedIn: 'root' })
export class MonthStore {
  private readonly dataAccess = inject(DATA_ACCESS);

  readonly symptomEntries = signal<MonthSymptomEntry[]>([]);
  /** The time of every meal */
  readonly meals = signal<Date[]>([]);

  private latestRequest = 0;

  async load(month: Date): Promise<void> {
    const request = ++this.latestRequest;
    const dateRange = monthRange('date', month);

    const [symptomEntries, meals] = await Promise.all([
      this.dataAccess.list<MonthSymptomEntry>({
        collectionName: 'symptomEntries',
        options: { dateRange, expand: 'to_symptom' },
        map: (record) => {
          const symptom = (record['expand'] as { to_symptom?: DataRecord })
            ?.to_symptom;
          return {
            date: fromPocketBaseDate(String(record['date'] ?? record.created)),
            symptomId: String(record['to_symptom'] ?? ''),
            symptomName: String(symptom?.['name'] ?? '–'),
            // PocketBase stores "no value" of a number as 0
            level: Number(record['discomfortLevel']) || null,
          };
        },
      }),
      this.dataAccess.list<Date>({
        collectionName: 'dishEntries',
        options: { dateRange },
        map: (record) =>
          fromPocketBaseDate(String(record['date'] ?? record.created)),
      }),
    ]);

    // A month that was requested later must not be overwritten by this one
    if (request !== this.latestRequest) return;
    this.symptomEntries.set(symptomEntries);
    this.meals.set(meals);
  }
}
