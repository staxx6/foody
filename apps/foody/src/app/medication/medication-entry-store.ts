import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';
import { dayRange } from '../shared/date-utils';
import { LocalizedName, toLocalizedName } from '../shared/i18n/i18n';

/** A medication that was taken, as shown in the list of a day */
export type MedicationEntry = {
  id: string;
  medicationId: string;
  name: string;
  strength: string;
  amount: string | null;
  amountUnit: LocalizedName | null;
  comment: string;
  imageUrl: string | null;
  date: string;
};

/** What is entered for an intake */
export type MedicationEntryInput = {
  date: string;
  medicationId: string;
  amount: string;
  amountUnitId: string;
  comment: string;
};

type MedicationEntryState = {
  entries: MedicationEntry[];
  isLoading: boolean;
  error: string | null;
};

function toData(input: MedicationEntryInput): Record<string, unknown> {
  return {
    date: input.date,
    to_medication: input.medicationId,
    amount: input.amount,
    to_amountUnit: input.amountUnitId,
    comment: input.comment,
  };
}

export const MedicationEntryStore = signalStore(
  { providedIn: 'root' },
  withState<MedicationEntryState>({
    entries: [],
    isLoading: false,
    error: null,
  }),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    /** Loads the entries of a day */
    async loadEntries(day: Date) {
      patchState(store, { isLoading: true, error: null });
      try {
        const entries = await dataAccess.list<MedicationEntry>({
          collectionName: 'medicationEntries',
          options: {
            dateRange: dayRange('date', day),
            expand: 'to_medication,to_amountUnit',
            sort: 'date',
          },
          map: (record) => {
            const expand = record['expand'] as
              | { to_medication?: DataRecord; to_amountUnit?: DataRecord }
              | undefined;
            const medication = expand?.to_medication;
            const images =
              (medication?.['images'] as string[] | undefined) ?? [];

            return {
              id: record.id,
              medicationId: String(record['to_medication'] ?? ''),
              name: String(medication?.['name'] ?? '–'),
              strength: String(medication?.['strength'] ?? ''),
              amount: record['amount'] ? String(record['amount']) : null,
              amountUnit: expand?.to_amountUnit
                ? toLocalizedName(expand.to_amountUnit)
                : null,
              comment: String(record['comment'] ?? ''),
              imageUrl:
                medication && images.length > 0
                  ? dataAccess.getFileUrl(medication, images[0])
                  : null,
              date: String(record['date'] ?? record.created),
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

    getEntry(id: string): Promise<MedicationEntryInput | null> {
      return dataAccess.getOne({
        collectionName: 'medicationEntries',
        id,
        map: (record) => ({
          date: String(record['date'] ?? record.created),
          medicationId: String(record['to_medication'] ?? ''),
          amount: String(record['amount'] ?? ''),
          amountUnitId: String(record['to_amountUnit'] ?? ''),
          comment: String(record['comment'] ?? ''),
        }),
      });
    },

    /** @returns the id of the new entry */
    async createEntry(input: MedicationEntryInput): Promise<string> {
      const entry = await dataAccess.create({
        collectionName: 'medicationEntries',
        data: toData(input),
        map: (record) => record,
      });
      return entry.id;
    },

    async updateEntry(id: string, input: MedicationEntryInput): Promise<void> {
      await dataAccess.update({
        collectionName: 'medicationEntries',
        id,
        data: toData(input),
        map: (record) => record,
      });
    },

    async deleteEntry(id: string): Promise<void> {
      await dataAccess.delete({ collectionName: 'medicationEntries', id });
      patchState(store, {
        entries: store.entries().filter((entry) => entry.id !== id),
      });
    },
  })),
);
