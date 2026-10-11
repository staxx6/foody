import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';
import { LocalizedName, toLocalizedName } from './i18n/i18n';

export type AmountUnit = LocalizedName & {
  id: string;
  code: string;
};

type AmountUnitState = {
  units: AmountUnit[];
  isLoading: boolean;
  isLoaded: boolean;
};

const initialState: AmountUnitState = {
  units: [],
  isLoading: false,
  isLoaded: false,
};

export const AmountUnitStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadUnits() {
      patchState(store, { isLoading: true });
      try {
        const units = await dataAccess.list<AmountUnit>({
          collectionName: 'amountUnitET',
          options: { sort: 'code' },
          map: (record) => ({
            ...toLocalizedName(record),
            id: record.id,
            code: String(record['code'] ?? ''),
          }),
        });
        patchState(store, { units, isLoading: false, isLoaded: true });
      } catch {
        patchState(store, { isLoading: false });
      }
    },

    async createUnit(code: string): Promise<AmountUnit> {
      const unit = await dataAccess.create<AmountUnit>({
        collectionName: 'amountUnitET',
        data: { code, name: code },
        map: (record) => ({
          ...toLocalizedName(record),
          id: record.id,
          code: String(record['code'] ?? ''),
        }),
      });
      // Not loaded yet: the next load fetches the new record anyway
      if (!store.isLoaded()) return unit;
      patchState(store, {
        units: [...store.units(), unit].sort((a, b) =>
          a.code.localeCompare(b.code),
        ),
      });
      return unit;
    },

    async deleteUnit(id: string): Promise<void> {
      await dataAccess.delete({ collectionName: 'amountUnitET', id });
      patchState(store, {
        units: store.units().filter((item) => item.id !== id),
      });
    },

    async updateUnit(id: string, names: LocalizedName): Promise<void> {
      await dataAccess.update({
        collectionName: 'amountUnitET',
        id,
        data: {
          name: names.name,
          name_de: names.nameDe,
          name_en: names.nameEn,
        },
        map: (record) => record,
      });
      await this.loadUnits();
    },
  })),
);
