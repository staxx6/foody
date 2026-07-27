import { signalStore, withState } from '@ngrx/signals';

type Ingredient = {
  id: string;
  name: string;
};

type IngredientState = {
  ingredients: Ingredient[];
  isLoading: boolean;
  filter: { query: string; order: 'asc' | 'desc' };
};

const initialIngredientState: IngredientState = {
  ingredients: [
    {
      id: '1',
      name: 'Dummy Object Ingredient',
    },
  ],
  isLoading: false,
  filter: { query: '', order: 'asc' },
};

export const IngredientStore = signalStore(
  { providedIn: 'root' },
  withState(initialIngredientState),
);
