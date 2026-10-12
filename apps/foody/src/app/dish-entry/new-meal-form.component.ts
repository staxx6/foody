import {
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { AutofocusDirective } from '../shared/keyboard/autofocus.directive';
import { FormsModule } from '@angular/forms';
import { DishEntryStore } from './dish-entry-store';
import { IngredientStore } from '../ingredient/ingredient-store';
import { DishStore } from '../dish/dish-store';
import { NewDishFormComponent } from '../dish/new-dish-form.component';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { AmountUnitStore } from '../shared/amount-unit-store';
import { UiStore } from '../shared/ui-store';
import { RecentUse, recentFirst } from '../shared/recent-use';
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

/** The forms that are shown in place of this one, see UiStore.nested */
const NESTED: Record<SourceType, string> = {
  'food-item': 'food',
  dish: 'dish',
};

/** A food or dish of a meal, with how much of it was eaten */
type MealItem = {
  sourceType: SourceType;
  sourceId: string;
  name: string;
  amount: string;
  amountUnitId: string;
  unitName: string;
};

// Most entries are a single piece of something
const DEFAULT_AMOUNT = '1';
const DEFAULT_UNIT_CODE = 'piece';
import { SearchSelectComponent } from '../shared/search/search-select.component';

@Component({
  selector: 'app-new-meal-form',
  imports: [
    FormsModule,
    AutofocusDirective,
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
          (cancelled)="uiStore.closeNested()"
        />
      }
      @case ('dish') {
        <app-new-dish-form
          (saved)="created($event.id)"
          (cancelled)="uiStore.closeNested()"
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
        <span class="label" id="meal-label">
          {{ items().length > 0 ? t().whatElse : t().whatDidYouEat }} *
        </span>
        <!-- Where the food or dish is chosen, set apart as a panel -->
        <div class="meal" role="group" aria-labelledby="meal-label">
          <div class="item">
            <div class="field">
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
                [appAutofocus]="!editId() && !copyId()"
                [options]="
                  sourceType === 'food-item' ? foodOptions() : dishOptions()
                "
                [value]="selectedSourceId()"
                (valueChange)="select($event)"
                [placeholder]="
                  sourceType === 'food-item' ? t().selectFood : t().selectDish
                "
                [ariaLabel]="sourceType === 'food-item' ? t().food : t().dish"
                [createLabel]="
                  sourceType === 'food-item' ? t().newFood : t().newDish
                "
                (create)="uiStore.openNested(nestedName[sourceType])"
              />
            </div>

            <div class="field-row">
              <div class="field">
                <label for="amount">{{ t().amount }} *</label
                ><input
                  id="amount"
                  name="amount"
                  [(ngModel)]="amount"
                  required
                />
              </div>
              <div class="field">
                <label for="unit">{{ t().unit }} *</label
                ><app-search-select
                  inputId="unit"
                  [options]="unitOptions()"
                  [(value)]="amountUnitId"
                  [placeholder]="t().search"
                  [createLabel]="t().newUnit"
                  (create)="unitAdd.open($event)"
                />
              </div>
            </div>
            <!-- Opened by the field of the unit; asks for the name only -->
            <app-quick-add
              #unitAdd
              [trigger]="false"
              [label]="t().newUnit"
              [placeholder]="t().unitPlaceholder"
              [create]="addUnit"
            />
          </div>

          <!-- Several things eaten together are logged in one go; an entry
               that is changed stays the one thing it is -->
          @if (!editId()) {
            <button
              type="button"
              class="another"
              [disabled]="!isItemValid()"
              (click)="addItem()"
            >
              <app-icon name="plus" /> {{ t().addAnother }}
            </button>
          }
        </div>

        <!-- What was added before is settled: a list of its own below the
             panel, where adding puts it -->
        @if (items().length > 0) {
          <div class="field added">
            <span class="label">
              <app-icon name="check" /> {{ t().alreadyAdded }}
            </span>
            <ul class="items">
              @for (item of items(); track $index) {
                <li>
                  <span class="name">{{ item.name }}</span>
                  <span class="amount">
                    {{ item.amount }} {{ item.unitName }}
                  </span>
                  <button
                    type="button"
                    (click)="removeItem($index)"
                    [attr.aria-label]="t().removeNamed(item.name)"
                  >
                    <app-icon name="close" />
                  </button>
                </li>
              }
            </ul>
          </div>
        }

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
  styles: [
    `
      /* The panel where a food or dish is chosen. It is tinted, so the white
         fields in it read as fields and the panel as one thing. */
      .meal {
        --field: var(--surface);
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 6px 0 14px;
        padding: 12px;
        border-radius: var(--radius-lg);
        background: var(--bg);
      }

      /* What was added before: settled, so tags instead of fields, in a
         list of their own that is no part of the panel */
      .added .label {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .added .label app-icon {
        color: var(--success);
      }

      .items {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .items li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 4px 4px 12px;
        border-radius: 999px;
        background: var(--primary-soft);
        color: var(--primary);
        font-size: 0.9rem;
      }

      .items .name {
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      .items .amount {
        opacity: 0.8;
      }

      .items button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: none;
        color: inherit;
        font-size: 0.8rem;
        cursor: pointer;
      }

      .items button:hover {
        background: var(--surface);
      }

      /* On the tint, the track of the switch has to be darker than it */
      .item .toggle {
        background: color-mix(in srgb, var(--text) 8%, transparent);
        /* A choice of its own, not a part of the field below */
        margin-bottom: 6px;
      }

      .item .field,
      .item .field-row {
        margin-bottom: 10px;
      }

      .item .field-row .field {
        margin-bottom: 0;
      }

      /* The panel sets the distances itself */
      .item app-quick-add {
        margin-bottom: 0;
      }

      /* An empty place for the next one, which pressing it fills */
      .another {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 44px;
        border: 1.5px dashed color-mix(in srgb, var(--primary) 45%, transparent);
        border-radius: var(--radius);
        background: none;
        color: var(--primary);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
      }

      .another:hover:not(:disabled) {
        border-style: solid;
        background: var(--primary-soft);
      }

      .another:disabled {
        border-color: var(--border);
        color: var(--text-muted);
        cursor: not-allowed;
      }
    `,
  ],
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
  protected readonly uiStore = inject(UiStore);
  private readonly recentUse = inject(RecentUse);

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  /** The entry a new one starts as a copy of: the same meal, eaten now */
  readonly copyId = input<string | null>(null);
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
  protected readonly creating = computed<SourceType | null>(() =>
    this.uiStore.isNested(NESTED.dish)
      ? 'dish'
      : this.uiStore.isNested(NESTED['food-item'])
        ? 'food-item'
        : null,
  );
  protected readonly nestedName = NESTED;

  /** What was eaten lately comes first in the search */
  private readonly recentFoods = signal<string[]>([]);
  private readonly recentDishes = signal<string[]>([]);
  protected readonly foodOptions = computed(() =>
    recentFirst(this.ingredientStore.foodItems(), this.recentFoods()),
  );
  protected readonly dishOptions = computed(() =>
    recentFirst(this.dishStore.dishes(), this.recentDishes()),
  );
  /** What else was eaten at the same time, added before the current choice */
  protected readonly items = signal<MealItem[]>([]);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.ingredientStore.loadFoodItems();
    this.dishStore.loadDishes();
    void this.selectDefaultUnit();
    void this.loadRecent();
    void this.loadRecord();
  }

  private async loadRecent(): Promise<void> {
    this.recentFoods.set(
      await this.recentUse.ids('dishEntries', 'to_foodItem'),
    );
    this.recentDishes.set(await this.recentUse.ids('dishEntries', 'to_dish'));
  }

  private async loadRecord(): Promise<void> {
    const id = this.editId();
    const entry = await this.dishEntryStore.getDishEntry(
      id ?? this.copyId() ?? '',
    );
    if (!entry) return;

    this.sourceType = entry.dishId ? 'dish' : 'food-item';
    this.selectedSourceId.set(entry.dishId ?? entry.foodItemId ?? '');
    this.amount = entry.amount;
    this.amountUnitId.set(entry.amountUnitId);
    // A copy is eaten now, not when the original was
    if (id) {
      const date = fromPocketBaseDate(entry.date);
      this.date = toDateInputValue(date);
      this.time = toTimeInputValue(date);
    }
    this.changes.markForCheck();
  }

  private async selectDefaultUnit(): Promise<void> {
    await this.amountUnitStore.loadUnits();
    const unit = this.amountUnitStore
      .units()
      .find(({ code }) => code === DEFAULT_UNIT_CODE);
    if (unit && !this.amountUnitId()) this.amountUnitId.set(unit.id);
  }

  /** Whether what is entered for one food or dish is complete */
  protected isItemValid(): boolean {
    return (
      !!this.selectedSourceId() && !!this.amount.trim() && !!this.amountUnitId()
    );
  }

  isValid(): boolean {
    // With items added before, nothing further has to be chosen
    const isComplete =
      this.isItemValid() ||
      (this.items().length > 0 && !this.selectedSourceId());
    return isComplete && !!this.date && !!this.time;
  }

  /** What is entered for the food or dish that is chosen */
  private currentItem(): MealItem {
    const id = this.selectedSourceId();
    const options =
      this.sourceType === 'dish'
        ? this.dishStore.dishes()
        : this.ingredientStore.foodItems();
    return {
      sourceType: this.sourceType,
      sourceId: id,
      name: options.find((option) => option.id === id)?.name ?? '',
      amount: this.amount.trim(),
      amountUnitId: this.amountUnitId(),
      unitName:
        this.unitOptions().find((unit) => unit.id === this.amountUnitId())
          ?.name ?? '',
    };
  }

  /** Keeps what is entered as part of the meal and starts the next one */
  protected addItem(): void {
    if (!this.isItemValid()) return;
    this.items.update((items) => [...items, this.currentItem()]);

    this.selectedSourceId.set('');
    this.amount = DEFAULT_AMOUNT;
    // Back to the usual unit; without one, the unit used last stays
    const unit = this.amountUnitStore
      .units()
      .find(({ code }) => code === DEFAULT_UNIT_CODE);
    if (unit) this.amountUnitId.set(unit.id);
    // On to choosing the next one
    this.host.nativeElement
      .querySelector<HTMLElement>('form app-search-select input')
      ?.focus();
  }

  protected removeItem(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
  }

  /** A food or dish that was created from here is selected right away */
  protected created(id: string): void {
    this.select(id);
    this.uiStore.closeNested();
  }

  /** Choosing a food suggests the amount it is usually eaten in */
  protected select(id: string): void {
    this.selectedSourceId.set(id);
    const food =
      this.sourceType === 'food-item'
        ? this.ingredientStore.foodItems().find((other) => other.id === id)
        : undefined;
    // A food without a usual amount leaves what is entered
    if (!food?.defaultAmount) return;

    this.amount = food.defaultAmount;
    if (food.defaultUnitId) this.amountUnitId.set(food.defaultUnitId);
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
      const date = toPocketBaseDate(fromDateAndTime(this.date, this.time));
      const toEntry = (item: MealItem) => ({
        date,
        amount: item.amount,
        amountUnitId: item.amountUnitId,
        foodItemId: item.sourceType === 'food-item' ? item.sourceId : undefined,
        dishId: item.sourceType === 'dish' ? item.sourceId : undefined,
      });

      let savedId = id ?? undefined;
      if (id) {
        await this.dishEntryStore.updateDishEntry(
          id,
          toEntry(this.currentItem()),
        );
      } else {
        // Everything eaten together becomes an entry of its own, all at the
        // same time
        const items = [
          ...this.items(),
          ...(this.isItemValid() ? [this.currentItem()] : []),
        ];
        for (const item of items) {
          savedId = await this.dishEntryStore.createDishEntry(toEntry(item));
        }
      }
      this.uiStore.done(savedId);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
