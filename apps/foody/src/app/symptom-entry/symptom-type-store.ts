import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';

export type SymptomType = { id: string; name: string };

type SymptomTypeState = { types: SymptomType[]; isLoading: boolean };

export const SymptomTypeStore = signalStore(
  { providedIn: 'root' },
  withState<SymptomTypeState>({ types: [], isLoading: false }),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadTypes() {
      if (store.types().length > 0) return;
      patchState(store, { isLoading: true });
      try {
        const types = await dataAccess.list<SymptomType>({
          collectionName: 'symptomTypeET',
          options: { sort: 'name' },
          map: (r) => ({ id: r.id, name: String(r['name'] ?? '') }),
        });
        patchState(store, { types, isLoading: false });
      } catch {
        patchState(store, { isLoading: false });
      }
    },

    async createType(name: string): Promise<SymptomType> {
      const type = await dataAccess.create<SymptomType>({
        collectionName: 'symptomTypeET',
        data: { name },
        map: (r) => ({ id: r.id, name: String(r['name'] ?? '') }),
      });
      patchState(store, {
        types: [...store.types(), type].sort((a, b) => a.name.localeCompare(b.name)),
      });
      return type;
    },
  })),
);
