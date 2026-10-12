import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';
import { ExistingImage } from '../shared/image-picker.component';

type FoodItem = {
  id: string;
  name: string;
  description?: string;
  /** The amount that is suggested when the food is logged */
  defaultAmount: string;
  defaultUnitId: string;
  imageNames: string[];
  imageUrl?: string;
  created: string;
  updated: string;
};

/** What is entered for a food */
export type FoodInput = {
  name: string;
  description: string;
  defaultAmount: string;
  defaultUnitId: string;
};

/** Everything of a food that can be edited */
export type FoodDetails = FoodInput & { images: ExistingImage[] };

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

function toInput(record: DataRecord): FoodInput {
  return {
    name: String(record['name'] ?? ''),
    description: String(record['description'] ?? ''),
    defaultAmount: String(record['defaultAmount'] ?? ''),
    defaultUnitId: String(record['to_defaultUnit'] ?? ''),
  };
}

function toData(input: FoodInput): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description,
    defaultAmount: input.defaultAmount,
    to_defaultUnit: input.defaultUnitId,
  };
}

export const IngredientStore = signalStore(
  { providedIn: 'root' },
  withState(initialIngredientState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    async loadFoodItems() {
      // add a function to the store
      patchState(store, { isLoading: true, error: null }); // change the state

      try {
        const foodItems = await dataAccess.list<FoodItem>({
          collectionName: 'foodItems',
          options: { sort: 'name' },
          map: (record) => {
            const images = (record['images'] as string[] | undefined) ?? [];

            return {
              ...toInput(record),
              id: record.id,
              imageNames: images,
              imageUrl:
                images.length > 0
                  ? dataAccess.getFileUrl(record, images[0])
                  : undefined,
              created: record.created,
              updated: record.updated,
            };
          },
        });
        patchState(store, { foodItems, isLoading: false });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        patchState(store, { isLoading: false, error: message });
      }
    },

    async createFoodItem(
      input: FoodInput,
      images: File[] = [],
    ): Promise<FoodItem> {
      const item = await dataAccess.create<FoodItem>({
        collectionName: 'foodItems',
        data: { ...toData(input), images },
        map: (record) => ({
          ...toInput(record),
          id: record.id,
          imageNames: [],
          imageUrl: undefined,
          created: record.created,
          updated: record.updated,
        }),
      });
      patchState(store, {
        foodItems: [...store.foodItems(), item].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      });
      return item;
    },

    async deleteFoodItem(id: string): Promise<void> {
      await dataAccess.delete({ collectionName: 'foodItems', id });
      patchState(store, {
        foodItems: store.foodItems().filter((item) => item.id !== id),
      });
    },

    getFoodItem(id: string): Promise<FoodDetails | null> {
      return dataAccess.getOne({
        collectionName: 'foodItems',
        id,
        map: (record) => ({
          ...toInput(record),
          images: ((record['images'] as string[] | undefined) ?? []).map(
            (name) => ({ name, url: dataAccess.getFileUrl(record, name) }),
          ),
        }),
      });
    },

    async updateFoodItem(
      id: string,
      input: FoodInput,
      addedImages: File[],
      removedImages: string[],
    ): Promise<{ id: string }> {
      const data = toData(input);
      if (addedImages.length > 0) data['images+'] = addedImages;
      if (removedImages.length > 0) data['images-'] = removedImages;
      await dataAccess.update({
        collectionName: 'foodItems',
        id,
        data,
        map: (record) => record,
      });
      await this.loadFoodItems();
      return { id };
    },
  })),
);
