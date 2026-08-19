import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';

export type SymptomLocation = { id: string; name: string };

type SymptomLocationState = {
  locations: SymptomLocation[];
  isLoading: boolean;
};

export const SymptomLocationStore = signalStore(
  { providedIn: 'root' },
  withState<SymptomLocationState>({ locations: [], isLoading: false }),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadLocations() {
      if (store.locations().length > 0) return;
      patchState(store, { isLoading: true });
      try {
        const locations = await dataAccess.list<SymptomLocation>({
          collectionName: 'symptomLocationET',
          options: { sort: 'name' },
          map: (r) => ({ id: r.id, name: String(r['name'] ?? '') }),
        });
        patchState(store, { locations, isLoading: false });
      } catch {
        patchState(store, { isLoading: false });
      }
    },

    async createLocation(name: string): Promise<SymptomLocation> {
      const location = await dataAccess.create<SymptomLocation>({
        collectionName: 'symptomLocationET',
        data: { name },
        map: (r) => ({ id: r.id, name: String(r['name'] ?? '') }),
      });
      patchState(store, {
        locations: [...store.locations(), location].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      });
      return location;
    },
  })),
);
