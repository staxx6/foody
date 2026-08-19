import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';

export type AmountUnit = {
  id: string;
  code: string;
};

type AmountUnitState = {
  units: AmountUnit[];
  isLoading: boolean;
};

const initialState: AmountUnitState = {
  units: [],
  isLoading: false,
};

export const AmountUnitStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadUnits() {
      if (store.units().length > 0) return;
      patchState(store, { isLoading: true });
      try {
        const units = await dataAccess.list<AmountUnit>({
          collectionName: 'amountUnitET',
          options: { sort: 'code' },
          map: (record) => ({
            id: record.id,
            code: String(record['code'] ?? ''),
          }),
        });
        patchState(store, { units, isLoading: false });
      } catch {
        patchState(store, { isLoading: false });
      }
    },
  })),
);
