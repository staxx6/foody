import {
  Component,
  computed,
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
import { AmountUnitStore } from '../shared/amount-unit-store';
import { FoodInput, IngredientStore } from './ingredient-store';
import { IconComponent } from '../shared/icon.component';
import {
  ExistingImage,
  ImagePickerComponent,
} from '../shared/image-picker.component';
import { findByName } from '../shared/name-utils';
import { SearchSelectComponent } from '../shared/search/search-select.component';

// Most foods are eaten as a single piece
const DEFAULT_AMOUNT = '1';
const DEFAULT_UNIT_CODE = 'piece';

@Component({
  selector: 'app-new-food-item-form',
  imports: [
    FormsModule,
    AutofocusDirective,
    IconComponent,
    ImagePickerComponent,
    SearchSelectComponent,
  ],
  template: `
    <div class="form-header">
      <button
        type="button"
        class="back-btn"
        (click)="cancelled.emit()"
        [attr.aria-label]="t().back"
      >
        <app-icon name="back" />
      </button>
      <h2>{{ editId() ? t().editFood : t().newFood }}</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="food-name">{{ t().name }} *</label
        ><input
          id="food-name"
          appAutofocus
          name="name"
          [(ngModel)]="name"
          [placeholder]="t().foodPlaceholder"
          required
        />
        @if (existing(); as duplicate) {
          <p class="warning">
            <span>{{ t().foodExists(duplicate.name) }}</span
            ><button type="button" class="link" (click)="saved.emit(duplicate)">
              {{ t().useExisting }}
            </button>
          </p>
        }
      </div>

      <div class="field-row">
        <div class="field">
          <label for="food-amount">{{ t().usualAmount }}</label>
          <input
            id="food-amount"
            name="defaultAmount"
            [(ngModel)]="defaultAmount"
          />
        </div>
        <div class="field">
          <label for="food-unit">{{ t().unit }}</label>
          <app-search-select
            inputId="food-unit"
            [options]="unitOptions()"
            [(value)]="defaultUnitId"
            [placeholder]="t().search"
          />
        </div>
      </div>
      <p class="hint">{{ t().usualAmountHint }}</p>

      <div class="field">
        <label for="food-description">{{ t().description }}</label
        ><textarea
          id="food-description"
          name="description"
          [(ngModel)]="description"
          rows="3"
          [placeholder]="t().optional"
        ></textarea>
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
          {{ isSaving() ? t().saving : existing() ? t().saveAnyway : t().save }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .field-row .field {
        margin-bottom: 0;
      }

      .hint {
        margin: 6px 0 18px;
        font-size: 0.8rem;
        color: var(--text-muted);
      }
    `,
  ],
})
export class NewFoodItemFormComponent implements OnInit {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly ingredientStore = inject(IngredientStore);
  private readonly unitStore = inject(AmountUnitStore);

  /** The created food */
  readonly saved = output<{ id: string }>();
  readonly cancelled = output<void>();

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  /** What a new record is called to begin with, e.g. what was searched for */
  readonly initialName = input('');
  private readonly changes = inject(ChangeDetectorRef);

  /** The units with their names in the current language */
  protected readonly unitOptions = computed(() =>
    this.unitStore
      .units()
      .map((unit) => ({ id: unit.id, name: this.i18n.name(unit) })),
  );

  name = '';
  description = '';
  defaultAmount = DEFAULT_AMOUNT;
  // Signal, as it is also set after loading
  readonly defaultUnitId = signal('');
  readonly images = signal<File[]>([]);
  /** The photos the food has, minus the ones removed in the form */
  readonly existingImages = signal<ExistingImage[]>([]);
  private originalImages: ExistingImage[] = [];
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.name = this.initialName();
    this.ingredientStore.loadFoodItems();
    void this.loadRecord();
  }

  private async loadRecord(): Promise<void> {
    await this.unitStore.loadUnits();

    const id = this.editId();
    const food = id ? await this.ingredientStore.getFoodItem(id) : null;
    if (food) {
      this.name = food.name;
      this.description = food.description;
      this.defaultAmount = food.defaultAmount;
      this.defaultUnitId.set(food.defaultUnitId);
      this.originalImages = food.images;
      this.existingImages.set(food.images);
    } else {
      const unit = this.unitStore
        .units()
        .find(({ code }) => code === DEFAULT_UNIT_CODE);
      this.defaultUnitId.set(unit?.id ?? '');
    }
    this.changes.markForCheck();
  }

  /** A record with the entered name, to warn about the duplicate */
  protected existing() {
    return findByName(
      this.ingredientStore
        .foodItems()
        .filter((food) => food.id !== this.editId()),
      this.name,
    );
  }

  async save(): Promise<void> {
    if (!this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const input: FoodInput = {
        name: this.name.trim(),
        description: this.description.trim(),
        defaultAmount: this.defaultAmount.trim(),
        defaultUnitId: this.defaultUnitId(),
      };
      const id = this.editId();
      const food = id
        ? await this.ingredientStore.updateFoodItem(
            id,
            input,
            this.images(),
            this.originalImages
              .filter((image) => !this.existingImages().includes(image))
              .map((image) => image.name),
          )
        : await this.ingredientStore.createFoodItem(input, this.images());
      this.saved.emit(food);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
