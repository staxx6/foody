import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';

export type Dish = {
  id: string;
  name: string;
  description: string;
};

type DishState = {
  dishes: Dish[];
  isLoading: boolean;
  error: string | null;
};

const initialState: DishState = {
  dishes: [],
  isLoading: false,
  error: null,
};

export const DishStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadDishes() {
      patchState(store, { isLoading: true, error: null });
      try {
        const dishes = await dataAccess.list<Dish>({
          collectionName: 'dishes',
          options: { sort: 'name' },
          map: (record) => ({
            id: record.id,
            name: String(record['name'] ?? ''),
            description: String(record['description'] ?? ''),
          }),
        });
        patchState(store, { dishes, isLoading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        patchState(store, { isLoading: false, error: message });
      }
    },

    async createDish(name: string, description: string): Promise<Dish> {
      const dish = await dataAccess.create<Dish>({
        collectionName: 'dishes',
        data: { name, description },
        map: (record) => ({
          id: record.id,
          name: String(record['name'] ?? ''),
          description: String(record['description'] ?? ''),
        }),
      });
      patchState(store, { dishes: [...store.dishes(), dish] });
      return dish;
    },
  })),
);
