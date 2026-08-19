import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';

export type Symptom = {
  id: string;
  name: string;
};

type SymptomState = {
  symptoms: Symptom[];
  isLoading: boolean;
};

const initialState: SymptomState = {
  symptoms: [],
  isLoading: false,
};

export const SymptomStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadSymptoms() {
      if (store.symptoms().length > 0) return;
      patchState(store, { isLoading: true });
      try {
        const symptoms = await dataAccess.list<Symptom>({
          collectionName: 'symptoms',
          options: { sort: 'name' },
          map: (record) => ({
            id: record.id,
            name: String(record['name'] ?? ''),
          }),
        });
        patchState(store, { symptoms, isLoading: false });
      } catch {
        patchState(store, { isLoading: false });
      }
    },

    async createSymptom(
      name: string,
      comment: string,
      typeId?: string,
      locationIds?: string[],
    ): Promise<Symptom> {
      const data: Record<string, unknown> = { name, comment };
      if (typeId) data['to_type'] = typeId;
      if (locationIds?.length) data['to_locations'] = locationIds;

      const symptom = await dataAccess.create<Symptom>({
        collectionName: 'symptoms',
        data,
        map: (record) => ({
          id: record.id,
          name: String(record['name'] ?? ''),
        }),
      });
      patchState(store, {
        symptoms: [...store.symptoms(), symptom].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      });
      return symptom;
    },
  })),
);
