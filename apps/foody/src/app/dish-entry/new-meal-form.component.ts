import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DishEntryStore } from './dish-entry-store';
import { IngredientStore } from '../ingredient/ingredient-store';
import { DishStore } from '../dish/dish-store';
import { AmountUnitStore } from '../shared/amount-unit-store';
import { UiStore } from '../shared/ui-store';

type SourceType = 'food-item' | 'dish';

@Component({
  selector: 'app-new-meal-form',
  imports: [FormsModule],
  template: `
    <div class="form-header">
      <button class="back-btn" (click)="cancel()">← Back</button>
      <h2>New Meal</h2>
    </div>

    <form (ngSubmit)="save()">
      <div class="field">
        <span class="label">Type</span>
        <div class="toggle" role="group">
          <button
            type="button"
            [class.active]="sourceType === 'food-item'"
            (click)="sourceType = 'food-item'; selectedSourceId = ''"
          >
            Food Item
          </button>
          <button
            type="button"
            [class.active]="sourceType === 'dish'"
            (click)="sourceType = 'dish'; selectedSourceId = ''"
          >
            Dish
          </button>
        </div>
      </div>

      <div class="field">
        <label for="source"
          >{{ sourceType === 'food-item' ? 'Food Item' : 'Dish' }} *</label
        >
        <select
          id="source"
          name="source"
          [(ngModel)]="selectedSourceId"
          required
        >
          <option value="">— Select —</option>
          @if (sourceType === 'food-item') {
            @for (item of ingredientStore.foodItems(); track item.id) {
              <option [value]="item.id">{{ item.name }}</option>
            }
          } @else {
            @for (dish of dishStore.dishes(); track dish.id) {
              <option [value]="dish.id">{{ dish.name }}</option>
            }
          }
        </select>
      </div>

      <div class="field row">
        <div class="field-inner">
          <label for="amount">Amount *</label>
          <input id="amount" name="amount" [(ngModel)]="amount" required />
        </div>
        <div class="field-inner">
          <label for="unit">Unit *</label>
          <select id="unit" name="unit" [(ngModel)]="amountUnitId" required>
            <option value="">—</option>
            @for (unit of amountUnitStore.units(); track unit.id) {
              <option [value]="unit.id">{{ unit.code }}</option>
            }
          </select>
        </div>
      </div>

      <div class="field">
        <label for="date">Date *</label>
        <input
          type="datetime-local"
          id="date"
          name="date"
          [(ngModel)]="date"
          required
        />
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="actions">
        <button type="button" class="secondary" (click)="cancel()">
          Cancel
        </button>
        <button type="submit" [disabled]="!isValid() || isSaving()">
          {{ isSaving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .form-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
      }

      .back-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #4caf50;
        font-size: 0.95rem;
        padding: 0;
      }

      h2 {
        margin: 0;
        font-size: 1.1rem;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 16px;
      }

      .field.row {
        flex-direction: row;
        gap: 12px;
        align-items: flex-end;
      }

      .field-inner {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }

      label,
      .label {
        font-size: 0.85rem;
        color: #666;
        font-weight: 500;
      }

      .label {
        display: block;
        margin-bottom: 4px;
      }

      input,
      select,
      textarea {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 1rem;
        outline: none;
        font-family: inherit;
        background: #fff;
      }

      input:focus,
      select:focus {
        border-color: #4caf50;
      }

      .toggle {
        display: flex;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
      }

      .toggle button {
        flex: 1;
        padding: 10px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        color: #666;
      }

      .toggle button.active {
        background: #4caf50;
        color: #fff;
      }

      .error {
        color: #e53935;
        font-size: 0.85rem;
      }

      .actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }

      button[type='submit'] {
        flex: 1;
        padding: 12px;
        background: #4caf50;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
      }

      button[type='submit']:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .secondary {
        flex: 1;
        padding: 12px;
        background: none;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
      }
    `,
  ],
})
export class NewMealFormComponent implements OnInit {
  readonly ingredientStore = inject(IngredientStore);
  readonly dishStore = inject(DishStore);
  readonly amountUnitStore = inject(AmountUnitStore);
  private readonly dishEntryStore = inject(DishEntryStore);
  private readonly uiStore = inject(UiStore);

  sourceType: SourceType = 'food-item';
  selectedSourceId = '';
  amount = '';
  amountUnitId = '';
  date = new Date().toISOString().slice(0, 16);

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.ingredientStore.loadFoodItems();
    this.dishStore.loadDishes();
    this.amountUnitStore.loadUnits();
  }

  isValid(): boolean {
    return (
      !!this.selectedSourceId && !!this.amount.trim() && !!this.amountUnitId
    );
  }

  cancel(): void {
    this.uiStore.goHome();
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      // PocketBase expects "YYYY-MM-DD HH:MM:SS.000Z"
      const pbDate = this.date.replace('T', ' ') + ':00.000Z';
      await this.dishEntryStore.createDishEntry({
        date: pbDate,
        amount: this.amount.trim(),
        amountUnitId: this.amountUnitId,
        foodItemId:
          this.sourceType === 'food-item' ? this.selectedSourceId : undefined,
        dishId: this.sourceType === 'dish' ? this.selectedSourceId : undefined,
      });
      await this.dishEntryStore.loadTodayEntries();
      this.uiStore.goHome();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
