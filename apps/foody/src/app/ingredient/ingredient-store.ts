import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';
import { ExistingImage } from '../shared/image-picker.component';

type FoodItem = {
  id: string;
  name: string;
  description?: string;
  imageNames: string[];
  imageUrl?: string;
  created: string;
  updated: string;
};

/** Everything of a food that can be edited */
export type FoodDetails = {
  name: string;
  description: string;
  images: ExistingImage[];
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
              id: record.id,
              name: String(record['name'] ?? ''),
              description: String(record['description'] ?? ''),
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
      name: string,
      description: string,
      images: File[] = [],
    ): Promise<FoodItem> {
      const item = await dataAccess.create<FoodItem>({
        collectionName: 'foodItems',
        data: { name, description, images },
        map: (record) => ({
          id: record.id,
          name: String(record['name'] ?? ''),
          description: String(record['description'] ?? ''),
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
          name: String(record['name'] ?? ''),
          description: String(record['description'] ?? ''),
          images: ((record['images'] as string[] | undefined) ?? []).map(
            (name) => ({ name, url: dataAccess.getFileUrl(record, name) }),
          ),
        }),
      });
    },

    async updateFoodItem(
      id: string,
      changes: {
        name: string;
        description: string;
        addedImages: File[];
        removedImages: string[];
      },
    ): Promise<{ id: string }> {
      const data: Record<string, unknown> = {
        name: changes.name,
        description: changes.description,
      };
      if (changes.addedImages.length > 0) data['images+'] = changes.addedImages;
      if (changes.removedImages.length > 0) {
        data['images-'] = changes.removedImages;
      }
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
