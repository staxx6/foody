import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IngredientStore } from './ingredient/ingredient-store';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: `
    <h1>Food Items</h1>

    @if (ingredientStore.isLoading()) {
      <p>Lade Food Items...</p>
    } @else if (ingredientStore.error()) {
      <p>Fehler: {{ ingredientStore.error() }}</p>
    } @else if (ingredientStore.foodItems().length === 0) {
      <p>Keine Food Items gefunden.</p>
    } @else {
      <ul>
        @for (foodItem of ingredientStore.foodItems(); track foodItem.id) {
          <li>
            {{ foodItem.name }}
            @if (foodItem.imageUrl) {
              <img [src]="foodItem.imageUrl" [alt]="foodItem.name" />
              {{ foodItem.imageNames }}
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    img {
      max-width: 256px;
      max-height: 256px;
      object-fit: contain;
    }
  `,
})
export class App {
  readonly ingredientStore = inject(IngredientStore);

  constructor() {
    void this.ingredientStore.loadFoodItems();
  }
}
