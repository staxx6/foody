import { Component, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DishStore, NewIngredient } from './dish-store';
import { IngredientStore } from '../ingredient/ingredient-store';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { AmountUnitStore } from '../shared/amount-unit-store';
import { IconComponent } from '../shared/icon.component';
import { ImagePickerComponent } from '../shared/image-picker.component';
import { findByName } from '../shared/name-utils';

@Component({
  selector: 'app-new-dish-form',
  imports: [
    FormsModule,
    IconComponent,
    ImagePickerComponent,
    NewFoodItemFormComponent,
  ],
  template: `
    @if (isCreatingFood()) {
      <app-new-food-item-form
        (saved)="foodCreated($event.id)"
        (cancelled)="isCreatingFood.set(false)"
      />
    }

    <!-- Hidden instead of removed, so the input is kept while creating a food -->
    <div [hidden]="isCreatingFood()">
      <div class="form-header">
        <button
          type="button"
          class="back-btn"
          (click)="cancelled.emit()"
          aria-label="Back"
        >
          <app-icon name="back" />
        </button>
        <h2>New Dish</h2>
      </div>

      <form class="card" (ngSubmit)="save()">
        <div class="field">
          <label for="dish-name">Name *</label>
          <input
            id="dish-name"
            name="name"
            [(ngModel)]="name"
            placeholder="e.g. lasagne"
            required
          />
          @if (existing(); as duplicate) {
            <p class="warning">
              <span>
                A dish named <strong>{{ duplicate.name }}</strong> already
                exists.
              </span>
              <button
                type="button"
                class="link"
                (click)="saved.emit(duplicate)"
              >
                Use existing
              </button>
            </p>
          }
        </div>

        <div class="field">
          <label for="dish-description">Description</label>
          <textarea
            id="dish-description"
            name="description"
            [(ngModel)]="description"
            rows="3"
            placeholder="optional"
          ></textarea>
        </div>

        <div class="field">
          <span class="label">Ingredients</span>
          @for (ingredient of ingredients(); track $index) {
            <div class="ingredient">
              <select
                class="food"
                [ngModel]="ingredient.foodItemId"
                (ngModelChange)="update($index, { foodItemId: $event })"
                [ngModelOptions]="{ standalone: true }"
                aria-label="Food"
              >
                <option value="">— Select food —</option>
                @for (food of ingredientStore.foodItems(); track food.id) {
                  <option [value]="food.id">{{ food.name }}</option>
                }
              </select>
              <input
                class="amount"
                type="number"
                min="0"
                step="any"
                [ngModel]="ingredient.amount"
                (ngModelChange)="
                  update($index, { amount: '' + ($event ?? '') })
                "
                [ngModelOptions]="{ standalone: true }"
                placeholder="Amount"
                aria-label="Amount"
              />
              <select
                class="unit"
                [ngModel]="ingredient.amountUnitId"
                (ngModelChange)="update($index, { amountUnitId: $event })"
                [ngModelOptions]="{ standalone: true }"
                aria-label="Unit"
              >
                <option value="">Unit</option>
                @for (unit of amountUnitStore.units(); track unit.id) {
                  <option [value]="unit.id">{{ unit.code }}</option>
                }
              </select>
              <button
                type="button"
                class="remove"
                (click)="remove($index)"
                aria-label="Remove ingredient"
              >
                <app-icon name="trash" />
              </button>
            </div>
          }
          <div class="ingredient-actions">
            <button type="button" class="link" (click)="add()">
              + Add ingredient
            </button>
            <button
              type="button"
              class="link"
              (click)="isCreatingFood.set(true)"
            >
              + Create new food
            </button>
          </div>
        </div>

        <div class="field">
          <span class="label">Photos</span>
          <app-image-picker [(files)]="images" />
        </div>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <div class="actions">
          <button type="button" class="secondary" (click)="cancelled.emit()">
            Cancel
          </button>
          <button type="submit" [disabled]="!name.trim() || isSaving()">
            {{ isSaving() ? 'Saving…' : existing() ? 'Save anyway' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .ingredient {
        display: grid;
        grid-template-columns: 1fr 5rem 5.5rem 44px;
        gap: 6px;
      }

      .ingredient select,
      .ingredient input {
        padding-left: 8px;
        padding-right: 4px;
      }

      .remove {
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius);
        background: none;
        color: var(--text-muted);
        cursor: pointer;
      }

      .remove:hover {
        color: var(--danger);
      }

      .ingredient-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 20px;
      }

      /* Narrow screens: the food gets its own line */
      @media (max-width: 420px) {
        .ingredient {
          grid-template-columns: 1fr 1fr 44px;
        }

        .ingredient .food {
          grid-column: 1 / -1;
        }
      }
    `,
  ],
})
export class NewDishFormComponent implements OnInit {
  private readonly dishStore = inject(DishStore);
  protected readonly ingredientStore = inject(IngredientStore);
  protected readonly amountUnitStore = inject(AmountUnitStore);

  /** The created dish */
  readonly saved = output<{ id: string }>();
  readonly cancelled = output<void>();

  name = '';
  description = '';
  readonly ingredients = signal<NewIngredient[]>([]);
  readonly images = signal<File[]>([]);
  readonly isCreatingFood = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.dishStore.loadDishes();
    this.ingredientStore.loadFoodItems();
    this.amountUnitStore.loadUnits();
  }

  protected add(foodItemId = ''): void {
    this.ingredients.update((ingredients) => [
      ...ingredients,
      { foodItemId, amount: '', amountUnitId: '' },
    ]);
  }

  protected update(index: number, change: Partial<NewIngredient>): void {
    this.ingredients.update((ingredients) =>
      ingredients.map((ingredient, i) =>
        i === index ? { ...ingredient, ...change } : ingredient,
      ),
    );
  }

  protected remove(index: number): void {
    this.ingredients.update((ingredients) =>
      ingredients.filter((_, i) => i !== index),
    );
  }

  protected foodCreated(foodItemId: string): void {
    this.add(foodItemId);
    this.isCreatingFood.set(false);
  }

  /** A record with the entered name, to warn about the duplicate */
  protected existing() {
    return findByName(this.dishStore.dishes(), this.name);
  }

  async save(): Promise<void> {
    if (!this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const dish = await this.dishStore.createDish(
        this.name.trim(),
        this.description.trim(),
        // Rows without a food are left over from adding and not meant
        this.ingredients().filter((ingredient) => ingredient.foodItemId),
        this.images(),
      );
      this.saved.emit(dish);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
