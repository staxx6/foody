import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';
import { dayRange } from '../shared/date-utils';

/** The body weight at a moment */
export type Weight = {
  id: string;
  kilograms: number;
  date: string;
};

/** What is entered for a weight */
export type WeightInput = {
  date: string;
  kilograms: number;
};

type WeightState = {
  weights: Weight[];
  isLoading: boolean;
  error: string | null;
};

/** The weight a text means, with a comma or a point; null if it is none */
export function parseKilograms(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() && Number.isFinite(value) && value > 0 ? value : null;
}

export const WeightStore = signalStore(
  { providedIn: 'root' },
  withState<WeightState>({
    weights: [],
    isLoading: false,
    error: null,
  }),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    /** Loads the weights of a day */
    async loadWeights(day: Date) {
      patchState(store, { isLoading: true, error: null });
      try {
        const weights = await dataAccess.list<Weight>({
          collectionName: 'weights',
          options: { dateRange: dayRange('date', day), sort: 'date' },
          map: (record) => ({
            id: record.id,
            kilograms: Number(record['kilograms']) || 0,
            date: String(record['date'] ?? record.created),
          }),
        });
        patchState(store, { weights, isLoading: false });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        patchState(store, { isLoading: false, error: message });
      }
    },

    getWeight(id: string): Promise<WeightInput | null> {
      return dataAccess.getOne({
        collectionName: 'weights',
        id,
        map: (record) => ({
          date: String(record['date'] ?? record.created),
          kilograms: Number(record['kilograms']) || 0,
        }),
      });
    },

    /** @returns the id of the new weight */
    async createWeight(input: WeightInput): Promise<string> {
      const weight = await dataAccess.create({
        collectionName: 'weights',
        data: input,
        map: (record) => record,
      });
      return weight.id;
    },

    async updateWeight(id: string, input: WeightInput): Promise<void> {
      await dataAccess.update({
        collectionName: 'weights',
        id,
        data: input,
        map: (record) => record,
      });
    },

    async deleteWeight(id: string): Promise<void> {
      await dataAccess.delete({ collectionName: 'weights', id });
      patchState(store, {
        weights: store.weights().filter((weight) => weight.id !== id),
      });
    },
  })),
);
