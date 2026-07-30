import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';

type FoodItem = {
  id: string;
  name: string;
  description?: string;
  images: string[];
  created: string;
  updated: string;
};

type IngredientState = {
  foodItems: FoodItem[];
  isLoading: boolean;
  error: string | null;
  filter: { query: string; order: 'asc' | 'desc' };
};

const initialIngredientState: IngredientState = {
  foodItems: [],
  isLoading: false,
  error: null,
  filter: { query: '', order: 'asc' },
};

export const IngredientStore = signalStore(
  { providedIn: 'root' },
  withState(initialIngredientState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadFoodItems() { // add a function to the store
      patchState(store, { isLoading: true, error: null }); // change the state

      try {
        const foodItems = await dataAccess.list<FoodItem>({
          collectionName: 'foodItems',
          options: { sort: 'name' },
          map: (record) => ({
            id: record.id,
            name: String(record['name'] ?? ''),
            description: String(record['description'] ?? ''),
            images: Array.isArray(record['images'])
              ? (record['images'] as string[])
              : [],
            created: record.created,
            updated: record.updated,
          }),
        });
        patchState(store, { foodItems, isLoading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        patchState(store, { isLoading: false, error: message });
      }
    },
  })),
);
