import {
  computed,
  Component,
  inject,
  OnInit,
  output,
  signal,
  ChangeDetectorRef,
  input,
} from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { AutofocusDirective } from '../shared/keyboard/autofocus.directive';
import { FormsModule } from '@angular/forms';
import { DishStore, NewIngredient } from './dish-store';
import { IngredientStore } from '../ingredient/ingredient-store';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { AmountUnitStore } from '../shared/amount-unit-store';
import { IconComponent } from '../shared/icon.component';
import {
  ExistingImage,
  ImagePickerComponent,
} from '../shared/image-picker.component';
import { findByName } from '../shared/name-utils';
import { SearchSelectComponent } from '../shared/search/search-select.component';
import { UiStore } from '../shared/ui-store';

/**
 * The form shown in place of this one, see UiStore.nested. Named after this
 * form, which can be shown in place of the one for a meal itself.
 */
const NESTED_FOOD = 'dish-food';

@Component({
  selector: 'app-new-dish-form',
  imports: [
    FormsModule,
    AutofocusDirective,
    SearchSelectComponent,
    IconComponent,
    ImagePickerComponent,
    NewFoodItemFormComponent,
  ],
  template: `
    @if (isCreatingFood()) {
      <app-new-food-item-form
        [initialName]="createName"
        (saved)="foodCreated($event.id)"
        (cancelled)="uiStore.closeNested()"
      />
    }

    <!-- Hidden instead of removed, so the input is kept while creating a food -->
    <div [hidden]="isCreatingFood()">
      <div class="form-header">
        <button
          type="button"
          class="back-btn"
          (click)="cancelled.emit()"
          [attr.aria-label]="t().back"
        >
          <app-icon name="back" />
        </button>
        <h2>{{ editId() ? t().editDish : t().newDish }}</h2>
      </div>

      <form class="card" (ngSubmit)="save()">
        <div class="field">
          <label for="dish-name">{{ t().name }} *</label
          ><input
            id="dish-name"
            appAutofocus
            name="name"
            [(ngModel)]="name"
            [placeholder]="t().dishPlaceholder"
            required
          />
          @if (existing(); as duplicate) {
            <p class="warning">
              <span>{{ t().dishExists(duplicate.name) }}</span
              ><button
                type="button"
                class="link"
                (click)="saved.emit(duplicate)"
              >
                {{ t().useExisting }}
              </button>
            </p>
          }
        </div>

        <div class="field">
          <label for="dish-description">{{ t().description }}</label
          ><textarea
            id="dish-description"
            name="description"
            [(ngModel)]="description"
            rows="3"
            [placeholder]="t().optional"
          ></textarea>
        </div>

        <div class="field">
          <span class="label">{{ t().ingredients }}</span>
          <div class="ingredients panel">
            @for (ingredient of ingredients(); track $index) {
              <div class="ingredient">
                <app-search-select
                  class="food"
                  [options]="ingredientStore.foodItems()"
                  [value]="ingredient.foodItemId"
                  (valueChange)="selectFood($index, $event)"
                  [ariaLabel]="t().food"
                  [createLabel]="t().newFood"
                  (create)="createFoodFor($index, $event)"
                  [ariaLabel]="t().food"
                />
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
                  [placeholder]="t().amount"
                  [attr.aria-label]="t().amount"
                />
                <app-search-select
                  class="unit"
                  [options]="unitOptions()"
                  [value]="ingredient.amountUnitId"
                  (valueChange)="update($index, { amountUnitId: $event })"
                  [placeholder]="t().unit"
                  [ariaLabel]="t().unit"
                />
                <button
                  type="button"
                  class="remove"
                  (click)="remove($index)"
                  [attr.aria-label]="t().removeIngredient"
                >
                  <app-icon name="trash" />
                </button>
              </div>
            }
            <div class="ingredient-actions">
              <button type="button" class="link" (click)="add()">
                {{ t().addIngredient }}
              </button>
            </div>
          </div>
        </div>

        <div class="field">
          <span class="label">{{ t().photos }}</span
          ><app-image-picker [(files)]="images" [(existing)]="existingImages" />
        </div>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <div class="actions">
          <button type="button" class="secondary" (click)="cancelled.emit()">
            {{ t().cancel }}
          </button>
          <button type="submit" [disabled]="!name.trim() || isSaving()">
            {{
              isSaving() ? t().saving : existing() ? t().saveAnyway : t().save
            }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      /* The ingredients belong together, see .panel */
      .ingredients {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

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
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly dishStore = inject(DishStore);
  protected readonly ingredientStore = inject(IngredientStore);
  protected readonly amountUnitStore = inject(AmountUnitStore);

  /** The units with their names in the current language */
  protected readonly unitOptions = computed(() =>
    this.amountUnitStore
      .units()
      .map((unit) => ({ id: unit.id, name: this.i18n.name(unit) })),
  );

  /** The created dish */
  readonly saved = output<{ id: string }>();
  readonly cancelled = output<void>();

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  /** What a new record is called to begin with, e.g. what was searched for */
  readonly initialName = input('');
  private readonly changes = inject(ChangeDetectorRef);

  name = '';
  description = '';
  readonly ingredients = signal<NewIngredient[]>([]);
  readonly images = signal<File[]>([]);
  /** The photos the dish has, minus the ones removed in the form */
  readonly existingImages = signal<ExistingImage[]>([]);
  private originalImages: ExistingImage[] = [];
  protected readonly uiStore = inject(UiStore);
  /** The form for a new food shown in place of this one */
  protected readonly nestedFood = NESTED_FOOD;
  readonly isCreatingFood = computed(() => this.uiStore.isNested(NESTED_FOOD));
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.name = this.initialName();
    this.dishStore.loadDishes();
    this.ingredientStore.loadFoodItems();
    this.amountUnitStore.loadUnits();
    void this.loadRecord();
  }

  private async loadRecord(): Promise<void> {
    const id = this.editId();
    const dish = id ? await this.dishStore.getDish(id) : null;
    if (!dish) return;

    this.name = dish.name;
    this.description = dish.description;
    this.ingredients.set(dish.ingredients);
    this.originalImages = dish.images;
    this.existingImages.set(dish.images);
    this.changes.markForCheck();
  }

  protected add(foodItemId = ''): void {
    this.ingredients.update((ingredients) => [
      ...ingredients,
      { foodItemId, amount: '', amountUnitId: '' },
    ]);
    if (foodItemId) this.selectFood(this.ingredients().length - 1, foodItemId);
  }

  /**
   * Choosing the food of an ingredient suggests the amount it is usually
   * eaten in, unless an amount was entered already
   */
  protected selectFood(index: number, foodItemId: string): void {
    const food = this.ingredientStore
      .foodItems()
      .find((other) => other.id === foodItemId);
    const isEmpty = !this.ingredients()[index]?.amount;
    this.update(index, {
      foodItemId,
      ...(food?.defaultAmount && isEmpty
        ? {
            amount: food.defaultAmount,
            amountUnitId: food.defaultUnitId,
          }
        : {}),
    });
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

  /** The ingredient that gets the food that is being created */
  private creatingFor: number | null = null;

  /** What the food that is created is called to begin with */
  protected createName = '';

  protected createFoodFor(index: number, name: string): void {
    this.createName = name;
    this.creatingFor = index;
    this.uiStore.openNested(NESTED_FOOD);
  }

  /** A food that was created from an ingredient becomes its food */
  protected foodCreated(foodItemId: string): void {
    if (this.creatingFor !== null && this.ingredients()[this.creatingFor]) {
      this.selectFood(this.creatingFor, foodItemId);
    } else {
      this.add(foodItemId);
    }
    this.creatingFor = null;
    this.uiStore.closeNested();
  }

  /** A record with the entered name, to warn about the duplicate */
  protected existing() {
    return findByName(
      this.dishStore.dishes().filter((dish) => dish.id !== this.editId()),
      this.name,
    );
  }

  async save(): Promise<void> {
    if (!this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      // Rows without a food are left over from adding and not meant
      const ingredients = this.ingredients().filter(
        (ingredient) => ingredient.foodItemId,
      );
      const dish = id
        ? await this.dishStore.updateDish(id, {
            name: this.name.trim(),
            description: this.description.trim(),
            ingredients,
            addedImages: this.images(),
            removedImages: this.originalImages
              .filter((image) => !this.existingImages().includes(image))
              .map((image) => image.name),
          })
        : await this.dishStore.createDish(
            this.name.trim(),
            this.description.trim(),
            ingredients,
            this.images(),
          );
      this.saved.emit(dish);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
