import {
  computed,
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectorRef,
  input,
} from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
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
  fromPocketBaseDate,
  toDateInputValue,
  toPocketBaseDate,
  toTimeInputValue,
} from '../shared/date-utils';

type SourceType = 'food-item' | 'dish';

// Most entries are a single piece of something
const DEFAULT_AMOUNT = '1';
const DEFAULT_UNIT_CODE = 'piece';
import { SearchSelectComponent } from '../shared/search/search-select.component';

@Component({
  selector: 'app-new-meal-form',
  imports: [
    FormsModule,
    SearchSelectComponent,
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
          [attr.aria-label]="t().back"
        >
          <app-icon name="back" />
        </button>
        <h2>{{ editId() ? t().editMeal : t().logMeal }}</h2>
      </div>

      <form class="card" (ngSubmit)="save()">
        <div class="field">
          <span class="label">{{ t().whatDidYouEat }} *</span>
          <div class="toggle" role="group">
            <button
              type="button"
              [class.active]="sourceType === 'food-item'"
              (click)="sourceType = 'food-item'; selectedSourceId.set('')"
            >
              {{ t().singleFood }}
            </button>
            <button
              type="button"
              [class.active]="sourceType === 'dish'"
              (click)="sourceType = 'dish'; selectedSourceId.set('')"
            >
              {{ t().dish }}
            </button>
          </div>
          <app-search-select
            [options]="
              sourceType === 'food-item'
                ? ingredientStore.foodItems()
                : dishStore.dishes()
            "
            [(value)]="selectedSourceId"
            [placeholder]="
              sourceType === 'food-item' ? t().selectFood : t().selectDish
            "
            [ariaLabel]="sourceType === 'food-item' ? t().food : t().dish"
          />
          <button type="button" class="link" (click)="creating.set(sourceType)">
            {{
              sourceType === 'food-item' ? t().createNewFood : t().createNewDish
            }}
          </button>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="amount">{{ t().amount }} *</label
            ><input id="amount" name="amount" [(ngModel)]="amount" required />
          </div>
          <div class="field">
            <label for="unit">{{ t().unit }} *</label
            ><app-search-select
              inputId="unit"
              [options]="unitOptions()"
              [(value)]="amountUnitId"
              [placeholder]="t().search"
            />
          </div>
        </div>
        <app-quick-add
          [label]="t().createNewUnit"
          [placeholder]="t().unitPlaceholder"
          [create]="addUnit"
        />
        <div class="field-row">
          <div class="field">
            <label for="date">{{ t().day }} *</label
            ><input
              type="date"
              id="date"
              name="date"
              [(ngModel)]="date"
              required
            />
          </div>
          <div class="field">
            <label for="time">{{ t().time }} *</label
            ><input
              type="time"
              id="time"
              name="time"
              [(ngModel)]="time"
              required
            />
          </div>
        </div>
        <button type="button" class="link" (click)="setNow()">
          {{ t().setToNow }}
        </button>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <div class="actions">
          <button type="button" class="secondary" (click)="cancel()">
            {{ t().cancel }}
          </button>
          <button type="submit" [disabled]="!isValid() || isSaving()">
            {{ isSaving() ? t().saving : t().save }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class NewMealFormComponent implements OnInit {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  readonly ingredientStore = inject(IngredientStore);
  readonly dishStore = inject(DishStore);
  readonly amountUnitStore = inject(AmountUnitStore);

  /** The units with their names in the current language */
  protected readonly unitOptions = computed(() =>
    this.amountUnitStore
      .units()
      .map((unit) => ({ id: unit.id, name: this.i18n.name(unit) })),
  );
  private readonly dishEntryStore = inject(DishEntryStore);
  private readonly uiStore = inject(UiStore);

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  private readonly changes = inject(ChangeDetectorRef);

  sourceType: SourceType = 'food-item';
  // Signals, as they are also set after loading and creating options
  readonly selectedSourceId = signal('');
  amount = DEFAULT_AMOUNT;
  readonly amountUnitId = signal('');
  // A new entry is meant for the day that is shown
  date = toDateInputValue(this.uiStore.selectedDay());
  time = toTimeInputValue(new Date());

  /** The form for a new food or dish shown in place of this one */
  protected readonly creating = signal<SourceType | null>(null);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.ingredientStore.loadFoodItems();
    this.dishStore.loadDishes();
    void this.selectDefaultUnit();
    void this.loadRecord();
  }

  private async loadRecord(): Promise<void> {
    const id = this.editId();
    const entry = id ? await this.dishEntryStore.getDishEntry(id) : null;
    if (!entry) return;

    const date = fromPocketBaseDate(entry.date);
    this.sourceType = entry.dishId ? 'dish' : 'food-item';
    this.selectedSourceId.set(entry.dishId ?? entry.foodItemId ?? '');
    this.amount = entry.amount;
    this.amountUnitId.set(entry.amountUnitId);
    this.date = toDateInputValue(date);
    this.time = toTimeInputValue(date);
    this.changes.markForCheck();
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

  /** Sets day and time to the current moment */
  protected setNow(): void {
    const now = new Date();
    this.date = toDateInputValue(now);
    this.time = toTimeInputValue(now);
  }

  cancel(): void {
    this.uiStore.close();
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const entry = {
        date: toPocketBaseDate(fromDateAndTime(this.date, this.time)),
        amount: this.amount.trim(),
        amountUnitId: this.amountUnitId(),
        foodItemId:
          this.sourceType === 'food-item' ? this.selectedSourceId() : undefined,
        dishId:
          this.sourceType === 'dish' ? this.selectedSourceId() : undefined,
      };
      await (id
        ? this.dishEntryStore.updateDishEntry(id, entry)
        : this.dishEntryStore.createDishEntry(entry));
      this.uiStore.close();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
