import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DishEntryStore } from './dish-entry-store';
import { IngredientStore } from '../ingredient/ingredient-store';
import { DishStore } from '../dish/dish-store';
import { NewDishFormComponent } from '../dish/new-dish-form.component';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { AmountUnitStore } from '../shared/amount-unit-store';
import { UiStore } from '../shared/ui-store';
import { IconComponent } from '../shared/icon.component';
import { QuickAddComponent } from '../shared/quick-add.component';
import {
  fromDateAndTime,
  toDateInputValue,
  toPocketBaseDate,
  toTimeInputValue,
} from '../shared/date-utils';

type SourceType = 'food-item' | 'dish';

// Most entries are a single piece of something
const DEFAULT_AMOUNT = '1';
const DEFAULT_UNIT_CODE = 'piece';

@Component({
  selector: 'app-new-meal-form',
  imports: [
    FormsModule,
    IconComponent,
    QuickAddComponent,
    NewFoodItemFormComponent,
    NewDishFormComponent,
  ],
  template: `
    @switch (creating()) {
      @case ('food-item') {
        <app-new-food-item-form
          (saved)="created($event.id)"
          (cancelled)="creating.set(null)"
        />
      }
      @case ('dish') {
        <app-new-dish-form
          (saved)="created($event.id)"
          (cancelled)="creating.set(null)"
        />
      }
    }

    <!-- Hidden instead of removed, so the input is kept while creating -->
    <div [hidden]="creating()">
      <div class="form-header">
        <button
          type="button"
          class="back-btn"
          (click)="cancel()"
          aria-label="Back"
        >
          <app-icon name="back" />
        </button>
        <h2>Log Meal</h2>
      </div>

      <form class="card" (ngSubmit)="save()">
        <div class="field">
          <span class="label">What did you eat or drink? *</span>
          <div class="toggle" role="group">
            <button
              type="button"
              [class.active]="sourceType === 'food-item'"
              (click)="sourceType = 'food-item'; selectedSourceId.set('')"
            >
              Single food
            </button>
            <button
              type="button"
              [class.active]="sourceType === 'dish'"
              (click)="sourceType = 'dish'; selectedSourceId.set('')"
            >
              Dish
            </button>
          </div>
          <select
            name="source"
            [(ngModel)]="selectedSourceId"
            [attr.aria-label]="sourceType === 'food-item' ? 'Food' : 'Dish'"
            required
          >
            @if (sourceType === 'food-item') {
              <option value="">— Select food —</option>
              @for (item of ingredientStore.foodItems(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            } @else {
              <option value="">— Select dish —</option>
              @for (dish of dishStore.dishes(); track dish.id) {
                <option [value]="dish.id">{{ dish.name }}</option>
              }
            }
          </select>
          <button type="button" class="link" (click)="creating.set(sourceType)">
            + Create new {{ sourceType === 'food-item' ? 'food' : 'dish' }}
          </button>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="amount">Amount *</label>
            <input id="amount" name="amount" [(ngModel)]="amount" required />
          </div>
          <div class="field">
            <label for="unit">Unit *</label>
            <select id="unit" name="unit" [(ngModel)]="amountUnitId" required>
              <option value="">—</option>
              @for (unit of amountUnitStore.units(); track unit.id) {
                <option [value]="unit.id">{{ unit.code }}</option>
              }
            </select>
          </div>
        </div>
        <app-quick-add label="unit" placeholder="e.g. ml" [create]="addUnit" />

        <div class="field-row">
          <div class="field">
            <label for="date">Day *</label>
            <input
              type="date"
              id="date"
              name="date"
              [(ngModel)]="date"
              required
            />
          </div>
          <div class="field">
            <label for="time">Time *</label>
            <input
              type="time"
              id="time"
              name="time"
              [(ngModel)]="time"
              required
            />
          </div>
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
    </div>
  `,
})
export class NewMealFormComponent implements OnInit {
  readonly ingredientStore = inject(IngredientStore);
  readonly dishStore = inject(DishStore);
  readonly amountUnitStore = inject(AmountUnitStore);
  private readonly dishEntryStore = inject(DishEntryStore);
  private readonly uiStore = inject(UiStore);

  sourceType: SourceType = 'food-item';
  // Signals, as they are also set after loading and creating options
  readonly selectedSourceId = signal('');
  amount = DEFAULT_AMOUNT;
  readonly amountUnitId = signal('');
  date = toDateInputValue(new Date());
  time = toTimeInputValue(new Date());

  /** The form for a new food or dish shown in place of this one */
  protected readonly creating = signal<SourceType | null>(null);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.ingredientStore.loadFoodItems();
    this.dishStore.loadDishes();
    void this.selectDefaultUnit();
  }

  private async selectDefaultUnit(): Promise<void> {
    await this.amountUnitStore.loadUnits();
    const unit = this.amountUnitStore
      .units()
      .find(({ code }) => code === DEFAULT_UNIT_CODE);
    if (unit && !this.amountUnitId()) this.amountUnitId.set(unit.id);
  }

  isValid(): boolean {
    return (
      !!this.selectedSourceId() &&
      !!this.amount.trim() &&
      !!this.amountUnitId() &&
      !!this.date &&
      !!this.time
    );
  }

  /** A food or dish that was created from here is selected right away */
  protected created(id: string): void {
    this.selectedSourceId.set(id);
    this.creating.set(null);
  }

  readonly addUnit = async (name: string): Promise<void> => {
    // An existing unit is selected instead of creating it a second time
    const unit =
      this.amountUnitStore
        .units()
        .find(({ code }) => code.toLowerCase() === name.toLowerCase()) ??
      (await this.amountUnitStore.createUnit(name));
    this.amountUnitId.set(unit.id);
  };

  cancel(): void {
    this.uiStore.goHome();
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.dishEntryStore.createDishEntry({
        date: toPocketBaseDate(fromDateAndTime(this.date, this.time)),
        amount: this.amount.trim(),
        amountUnitId: this.amountUnitId(),
        foodItemId:
          this.sourceType === 'food-item' ? this.selectedSourceId() : undefined,
        dishId:
          this.sourceType === 'dish' ? this.selectedSourceId() : undefined,
      });
      this.uiStore.goHome();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
