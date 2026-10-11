import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';
import { ExistingImage } from '../shared/image-picker.component';

export type Dish = {
  id: string;
  name: string;
  description: string;
  /** The ingredients belong to the dish and are deleted with it */
  ingredientIds: string[];
};

export type NewIngredient = {
  foodItemId: string;
  amount: string;
  amountUnitId: string;
};

/** Everything of a dish that can be edited */
export type DishDetails = {
  name: string;
  description: string;
  ingredients: NewIngredient[];
  images: ExistingImage[];
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

function toDish(record: DataRecord): Dish {
  return {
    id: record.id,
    name: String(record['name'] ?? ''),
    description: String(record['description'] ?? ''),
    ingredientIds: (record['to_ingredients'] as string[] | undefined) ?? [],
  };
}

export const DishStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => {
    async function createIngredients(
      ingredients: NewIngredient[],
    ): Promise<string[]> {
      const ids: string[] = [];
      for (const ingredient of ingredients) {
        const data: Record<string, unknown> = {
          to_foodItem: ingredient.foodItemId,
        };
        if (ingredient.amount.trim()) {
          data['amount'] = Number(ingredient.amount);
        }
        if (ingredient.amountUnitId) {
          data['to_amountUnit'] = ingredient.amountUnitId;
        }
        ids.push(
          await dataAccess.create({
            collectionName: 'ingredients',
            data,
            map: (record) => record.id,
          }),
        );
      }
      return ids;
    }

    async function deleteIngredients(ids: string[]): Promise<void> {
      for (const id of ids) {
        await dataAccess.delete({ collectionName: 'ingredients', id });
      }
    }

    async function loadDishes(): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const dishes = await dataAccess.list<Dish>({
          collectionName: 'dishes',
          options: { sort: 'name' },
          map: toDish,
        });
        patchState(store, { dishes, isLoading: false });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        patchState(store, { isLoading: false, error: message });
      }
    }

    return {
      loadDishes,

      getDish(id: string): Promise<DishDetails | null> {
        return dataAccess.getOne({
          collectionName: 'dishes',
          id,
          expand: 'to_ingredients',
          map: (record) => {
            const expand = record['expand'] as
              | { to_ingredients?: DataRecord[] }
              | undefined;
            const images = (record['images'] as string[] | undefined) ?? [];
            return {
              name: String(record['name'] ?? ''),
              description: String(record['description'] ?? ''),
              ingredients: (expand?.to_ingredients ?? []).map((ingredient) => ({
                foodItemId: String(ingredient['to_foodItem'] ?? ''),
                amount: ingredient['amount']
                  ? String(ingredient['amount'])
                  : '',
                amountUnitId: String(ingredient['to_amountUnit'] ?? ''),
              })),
              images: images.map((name) => ({
                name,
                url: dataAccess.getFileUrl(record, name),
              })),
            };
          },
        });
      },

      async createDish(
        name: string,
        description: string,
        ingredients: NewIngredient[] = [],
        images: File[] = [],
      ): Promise<Dish> {
        // The dish refers to its ingredients, so they are created first
        const ingredientIds = await createIngredients(ingredients);
        const dish = await dataAccess.create<Dish>({
          collectionName: 'dishes',
          data: { name, description, images, to_ingredients: ingredientIds },
          map: toDish,
        });
        patchState(store, {
          dishes: [...store.dishes(), dish].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        });
        return dish;
      },

      async updateDish(
        id: string,
        changes: {
          name: string;
          description: string;
          ingredients: NewIngredient[];
          addedImages: File[];
          removedImages: string[];
        },
      ): Promise<Dish> {
        const previous = await dataAccess.getOne({
          collectionName: 'dishes',
          id,
          map: toDish,
        });

        // The ingredients are replaced as a whole: new ones are created and
        // linked before the previous ones are removed
        const ingredientIds = await createIngredients(changes.ingredients);
        const data: Record<string, unknown> = {
          name: changes.name,
          description: changes.description,
          to_ingredients: ingredientIds,
        };
        if (changes.addedImages.length > 0) {
          data['images+'] = changes.addedImages;
        }
        if (changes.removedImages.length > 0) {
          data['images-'] = changes.removedImages;
        }
        const dish = await dataAccess.update<Dish>({
          collectionName: 'dishes',
          id,
          data,
          map: toDish,
        });
        await deleteIngredients(previous?.ingredientIds ?? []);

        await loadDishes();
        return dish;
      },

      async deleteDish(id: string): Promise<void> {
        const dish = store.dishes().find((other) => other.id === id);
        await dataAccess.delete({ collectionName: 'dishes', id });
        await deleteIngredients(dish?.ingredientIds ?? []);
        patchState(store, {
          dishes: store.dishes().filter((other) => other.id !== id),
        });
      },
    };
  }),
);
