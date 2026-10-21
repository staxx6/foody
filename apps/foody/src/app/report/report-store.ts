import { inject, Injectable, signal } from '@angular/core';
import { DATA_ACCESS, DataRecord, DateRange } from '@foody/pocketbase-access';
import {
  addDays,
  fromPocketBaseDate,
  startOfDay,
  toDateInputValue,
} from '../shared/date-utils';
import { LocalizedName, toLocalizedName } from '../shared/i18n/i18n';
import {
  FOLLOW_UP_COLLECTION,
  FollowUpCourse,
} from '../symptom-entry/symptom-entry-store';

export type ReportMeal = {
  id: string;
  time: Date;
  kind: 'food' | 'dish';
  itemId: string;
  name: string;
  amount: string;
  unit: LocalizedName | null;
  /** The foods a dish consists of */
  ingredients: { id: string; name: string }[];
};

export type ReportSymptom = {
  time: Date;
  symptomId: string;
  name: string;
  /** Discomfort level 1-100, null if none was entered */
  level: number | null;
  comment: string;
};

/** How a symptom was some time after it was logged */
export type ReportFollowUp = {
  time: Date;
  /** The symptom of the entry it belongs to */
  symptomId: string;
  /** The name of the symptom */
  name: string;
  course: FollowUpCourse;
  level: number | null;
  comment: string;
};

export type ReportMedication = {
  time: Date;
  name: string;
  strength: string;
  amount: string;
  unit: LocalizedName | null;
  comment: string;
};

export type ReportData = {
  meals: ReportMeal[];
  symptoms: ReportSymptom[];
  /** The ones that got worse also count as complaints of their own */
  followUps: ReportFollowUp[];
  medications: ReportMedication[];
};

/** The day that many days before today, as value of a date input */
export function daysAgo(days: number): string {
  return toDateInputValue(addDays(startOfDay(new Date()), -days));
}

const DEFAULT_PERIOD_DAYS = 90;
const DEFAULT_TIME_SPAN_HOURS = 24;

type Expand = Record<string, DataRecord | DataRecord[] | undefined>;

function expanded(record: DataRecord, field: string): DataRecord[] {
  const value = (record['expand'] as Expand | undefined)?.[field];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const timeOf = (record: DataRecord) =>
  fromPocketBaseDate(String(record['date'] ?? record.created));

/**
 * Everything that was logged in a period, for the analysis and the export
 */
@Injectable({ providedIn: 'root' })
export class ReportStore {
  private readonly dataAccess = inject(DATA_ACCESS);

  /** The period as values of the date inputs, both days included */
  readonly from = signal(daysAgo(DEFAULT_PERIOD_DAYS));
  readonly to = signal(toDateInputValue(new Date()));
  /** Only this symptom counts; empty for all */
  readonly symptomId = signal('');
  /** How long after a meal symptoms are attributed to it */
  readonly hours = signal(DEFAULT_TIME_SPAN_HOURS);

  async load(from: Date, to: Date): Promise<ReportData> {
    const dateRange: DateRange = { field: 'date', from, to };

    const [meals, symptoms, followUps, medications] = await Promise.all([
      this.dataAccess.list<ReportMeal | null>({
        collectionName: 'dishEntries',
        options: {
          dateRange,
          sort: 'date',
          expand:
            'to_foodItem,to_amountUnit,to_dish,to_dish.to_ingredients.to_foodItem',
        },
        map: (record) => {
          const [food] = expanded(record, 'to_foodItem');
          const [dish] = expanded(record, 'to_dish');
          const item = food ?? dish;
          // The food or dish was deleted: nothing to say about the entry
          if (!item) return null;

          const [unit] = expanded(record, 'to_amountUnit');
          return {
            id: record.id,
            time: timeOf(record),
            kind: food ? 'food' : 'dish',
            itemId: item.id,
            name: String(item['name'] ?? ''),
            amount: String(record['amount'] ?? ''),
            unit: unit ? toLocalizedName(unit) : null,
            ingredients: dish
              ? expanded(dish, 'to_ingredients')
                  .flatMap((ingredient) => expanded(ingredient, 'to_foodItem'))
                  .map((ingredient) => ({
                    id: ingredient.id,
                    name: String(ingredient['name'] ?? ''),
                  }))
              : [],
          };
        },
      }),
      this.dataAccess.list<ReportSymptom>({
        collectionName: 'symptomEntries',
        options: { dateRange, sort: 'date', expand: 'to_symptom' },
        map: (record) => {
          const [symptom] = expanded(record, 'to_symptom');
          return {
            time: timeOf(record),
            symptomId: String(record['to_symptom'] ?? ''),
            name: String(symptom?.['name'] ?? '–'),
            // PocketBase stores "no value" of a number as 0
            level: Number(record['discomfortLevel']) || null,
            comment: String(record['comment'] ?? ''),
          };
        },
      }),
      this.dataAccess.list<ReportFollowUp>({
        collectionName: FOLLOW_UP_COLLECTION,
        options: {
          dateRange,
          sort: 'date',
          expand: 'to_symptomEntry.to_symptom',
        },
        map: (record) => {
          const [entry] = expanded(record, 'to_symptomEntry');
          const [symptom] = entry ? expanded(entry, 'to_symptom') : [];
          return {
            time: timeOf(record),
            symptomId: String(entry?.['to_symptom'] ?? ''),
            name: String(symptom?.['name'] ?? '–'),
            course: String(record['course'] ?? 'same') as FollowUpCourse,
            level: Number(record['discomfortLevel']) || null,
            comment: String(record['comment'] ?? ''),
          };
        },
      }),
      this.dataAccess.list<ReportMedication>({
        collectionName: 'medicationEntries',
        options: {
          dateRange,
          sort: 'date',
          expand: 'to_medication,to_amountUnit',
        },
        map: (record) => {
          const [medication] = expanded(record, 'to_medication');
          const [unit] = expanded(record, 'to_amountUnit');
          return {
            time: timeOf(record),
            name: String(medication?.['name'] ?? '–'),
            strength: String(medication?.['strength'] ?? ''),
            amount: String(record['amount'] ?? ''),
            unit: unit ? toLocalizedName(unit) : null,
            comment: String(record['comment'] ?? ''),
          };
        },
      }),
    ]);

    return {
      meals: meals.filter((meal): meal is ReportMeal => meal !== null),
      symptoms,
      followUps,
      medications,
    };
  }
}
