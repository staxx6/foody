import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';
import { dayRange } from '../shared/date-utils';
import { LocalizedName, toLocalizedName } from '../shared/i18n/i18n';

export type DishEntry = {
  id: string;
  name: string;
  amount: string | null;
  amountUnit: LocalizedName | null;
  imageUrl: string | null;
  date: string;
};

/** What is entered for a meal */
export type DishEntryInput = {
  date: string;
  amount: string;
  amountUnitId: string;
  foodItemId?: string;
  dishId?: string;
};

type DishEntryState = {
  entries: DishEntry[];
  isLoading: boolean;
  error: string | null;
};

const initialState: DishEntryState = {
  entries: [],
  isLoading: false,
  error: null,
};

export const DishEntryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadTodayEntries() {
      patchState(store, { isLoading: true, error: null });

      try {
        const entries = await dataAccess.list<DishEntry>({
          collectionName: 'dishEntries',
          options: {
            dateRange: dayRange('date'),
            expand: 'to_foodItem,to_dish,to_amountUnit',
            sort: 'date',
          },
          map: (record) => {
            const expand = record['expand'] as
              | Record<string, Record<string, unknown>>
              | undefined;

            const foodItem = expand?.['to_foodItem'] as
              | (Record<string, unknown> & DataRecord)
              | undefined;
            const dish = expand?.['to_dish'] as
              | (Record<string, unknown> & DataRecord)
              | undefined;
            const source = foodItem ?? dish;

            const name = String(source?.['name'] ?? '–');
            const images = (source?.['images'] as string[] | undefined) ?? [];
            const imageUrl =
              images.length > 0 && source
                ? dataAccess.getFileUrl(source, images[0])
                : null;

            return {
              id: record.id,
              name,
              amount: record['amount'] ? String(record['amount']) : null,
              amountUnit: expand?.['to_amountUnit']
                ? toLocalizedName(expand['to_amountUnit'])
                : null,
              imageUrl,
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

    async createDishEntry(payload: {
      date: string;
      amount: string;
      amountUnitId: string;
      foodItemId?: string;
      dishId?: string;
    }): Promise<void> {
      const data: Record<string, unknown> = {
        date: payload.date,
        amount: payload.amount,
        to_amountUnit: payload.amountUnitId,
      };
      if (payload.foodItemId) data['to_foodItem'] = payload.foodItemId;
      if (payload.dishId) data['to_dish'] = payload.dishId;

      await dataAccess.create<DishEntry>({
        collectionName: 'dishEntries',
        data,
        map: (record) => ({
          id: record.id,
          name: '',
          amount: record['amount'] ? String(record['amount']) : null,
          amountUnit: null,
          imageUrl: null,
          date: record['date'] ? String(record['date']) : record.created,
        }),
      });
    },

    async deleteDishEntry(id: string): Promise<void> {
      await dataAccess.delete({ collectionName: 'dishEntries', id });
      patchState(store, {
        entries: store.entries().filter((item) => item.id !== id),
      });
    },

    getDishEntry(id: string): Promise<DishEntryInput | null> {
      return dataAccess.getOne({
        collectionName: 'dishEntries',
        id,
        map: (record) => ({
          date: String(record['date'] ?? record.created),
          amount: String(record['amount'] ?? ''),
          amountUnitId: String(record['to_amountUnit'] ?? ''),
          foodItemId: String(record['to_foodItem'] ?? '') || undefined,
          dishId: String(record['to_dish'] ?? '') || undefined,
        }),
      });
    },

    async updateDishEntry(id: string, input: DishEntryInput): Promise<void> {
      await dataAccess.update({
        collectionName: 'dishEntries',
        id,
        data: {
          date: input.date,
          amount: input.amount,
          to_amountUnit: input.amountUnitId,
          // An entry is either a food or a dish
          to_foodItem: input.foodItemId ?? '',
          to_dish: input.dishId ?? '',
        },
        map: (record) => record,
      });
    },
  })),
);
