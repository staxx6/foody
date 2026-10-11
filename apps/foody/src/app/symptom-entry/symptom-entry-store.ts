import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';
import { dayRange } from '../shared/date-utils';

export type SymptomEntry = {
  id: string;
  symptomName: string;
  discomfortLevel: number | null;
  locationImageUrls: string[];
  date: string;
};

/** What is entered for a symptom entry */
export type SymptomEntryInput = {
  date: string;
  symptomId: string;
  discomfortLevel?: number | null;
  comment?: string;
};

type SymptomEntryState = {
  entries: SymptomEntry[];
  isLoading: boolean;
  error: string | null;
};

const initialState: SymptomEntryState = {
  entries: [],
  isLoading: false,
  error: null,
};

export const SymptomEntryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    /** Loads the entries of a day */
    async loadEntries(day: Date) {
      patchState(store, { isLoading: true, error: null });

      try {
        const entries = await dataAccess.list<SymptomEntry>({
          collectionName: 'symptomEntries',
          options: {
            dateRange: dayRange('date', day),
            expand: 'to_symptom,to_symptom.to_locations',
            sort: 'date',
          },
          map: (record) => {
            const expand = record['expand'] as
              | Record<string, Record<string, unknown>>
              | undefined;
            const symptom = expand?.['to_symptom'] as
              | (Record<string, unknown> & { expand?: Record<string, unknown> })
              | undefined;
            const rawLocations = symptom?.['expand']?.['to_locations'];
            const locations = (
              Array.isArray(rawLocations)
                ? rawLocations
                : rawLocations
                  ? [rawLocations]
                  : []
            ) as (Record<string, unknown> & DataRecord)[];

            const locationImageUrls = locations
              .filter((loc) => loc['image'])
              .map((loc) => dataAccess.getFileUrl(loc, String(loc['image'])));

            return {
              id: record.id,
              symptomName: String(symptom?.['name'] ?? '-'),
              discomfortLevel: Number(record['discomfortLevel']) || null,
              locationImageUrls,
              date: record['date'] ? String(record['date']) : record.created,
            };
          },
        });
        patchState(store, { entries, isLoading: false });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        patchState(store, { isLoading: false, error: message });
      }
    },

    async createSymptomEntry(payload: {
      date: string;
      symptomId: string;
      discomfortLevel?: number | null;
      comment?: string;
    }): Promise<void> {
      const data: Record<string, unknown> = {
        date: payload.date,
        to_symptom: payload.symptomId,
      };
      if (payload.discomfortLevel != null)
        data['discomfortLevel'] = payload.discomfortLevel;
      if (payload.comment) data['comment'] = payload.comment;

      await dataAccess.create<SymptomEntry>({
        collectionName: 'symptomEntries',
        data,
        map: (record) => ({
          id: record.id,
          symptomName: '',
          discomfortLevel:
            record['discomfortLevel'] != null
              ? Number(record['discomfortLevel'])
              : null,
          locationImageUrls: [],
          date: record['date'] ? String(record['date']) : record.created,
        }),
      });
    },

    async deleteSymptomEntry(id: string): Promise<void> {
      await dataAccess.delete({ collectionName: 'symptomEntries', id });
      patchState(store, {
        entries: store.entries().filter((item) => item.id !== id),
      });
    },

    getSymptomEntry(id: string): Promise<SymptomEntryInput | null> {
      return dataAccess.getOne({
        collectionName: 'symptomEntries',
        id,
        map: (record) => ({
          date: String(record['date'] ?? record.created),
          symptomId: String(record['to_symptom'] ?? ''),
          // PocketBase stores "no value" of a number as 0
          discomfortLevel: Number(record['discomfortLevel']) || null,
          comment: String(record['comment'] ?? ''),
        }),
      });
    },

    async updateSymptomEntry(
      id: string,
      input: SymptomEntryInput,
    ): Promise<void> {
      await dataAccess.update({
        collectionName: 'symptomEntries',
        id,
        data: {
          date: input.date,
          to_symptom: input.symptomId,
          discomfortLevel: input.discomfortLevel ?? null,
          comment: input.comment ?? '',
        },
        map: (record) => record,
      });
    },
  })),
);
