import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';

export type SymptomEntry = {
  id: string;
  symptomName: string;
  discomfortLevel: number | null;
  locationImageUrls: string[];
  date: string;
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
    async loadTodayEntries() {
      patchState(store, { isLoading: true, error: null });

      const today = new Date().toISOString().slice(0, 10);

      try {
        const entries = await dataAccess.list<SymptomEntry>({
          collectionName: 'symptomEntries',
          options: {
            filter: `date >= "${today} 00:00:00" && date < "${today} 23:59:59"`,
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
              discomfortLevel:
                record['discomfortLevel'] != null
                  ? Number(record['discomfortLevel'])
                  : null,
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
  })),
);
