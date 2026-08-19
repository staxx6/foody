import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';

export type DishEntry = {
  id: string;
  name: string;
  amount: string | null;
  amountUnitCode: string | null;
  amountUnitName: string | null;
  imageUrl: string | null;
  date: string;
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

      const today = new Date().toISOString().slice(0, 10);

      try {
        const entries = await dataAccess.list<DishEntry>({
          collectionName: 'dishEntries',
          options: {
            filter: `date >= "${today} 00:00:00" && date < "${today} 23:59:59"`,
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
              amountUnitCode: expand?.['to_amountUnit']?.['code']
                ? String(expand['to_amountUnit']['code'])
                : null,
              amountUnitName: expand?.['to_amountUnit']?.['name']
                ? String(expand['to_amountUnit']['name'])
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
          amountUnitCode: null,
          amountUnitName: null,
          imageUrl: null,
          date: record['date'] ? String(record['date']) : record.created,
        }),
      });
    },
  })),
);
