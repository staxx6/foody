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
  /** The time of every medication that was taken */
  readonly medications = signal<Date[]>([]);

  private latestRequest = 0;

  async load(month: Date): Promise<void> {
    const request = ++this.latestRequest;
    const dateRange = monthRange('date', month);

    const [symptomEntries, meals, medications] = await Promise.all([
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
      this.dataAccess.list<Date>({
        collectionName: 'medicationEntries',
        options: { dateRange },
        map: (record) =>
          fromPocketBaseDate(String(record['date'] ?? record.created)),
      }),
    ]);

    // A month that was requested later must not be overwritten by this one
    if (request !== this.latestRequest) return;
    this.symptomEntries.set(symptomEntries);
    this.meals.set(meals);
    this.medications.set(medications);
  }
}

/** An entry without a discomfort level counts as a medium one */
const DEFAULT_LEVEL = 50;
/**
 * Up to which discomfort of a day (the levels of its entries added up) it
 * gets the first, second and third step of the scale; above is the fourth
 */
const STEP_LIMITS = [50, 100, 200];

export function levelOrDefault(level: number | null): number {
  return level ?? DEFAULT_LEVEL;
}

/**
 * The step of the scale a day gets: 0 without complaints, otherwise 1-4
 * @param discomfort the levels of the entries of the day added up
 */
export function discomfortStep(complaints: number, discomfort: number): number {
  if (complaints === 0) return 0;
  return STEP_LIMITS.filter((limit) => discomfort > limit).length + 1;
}
