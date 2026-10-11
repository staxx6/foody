import {
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
import { IngredientStore } from './ingredient-store';
import { IconComponent } from '../shared/icon.component';
import {
  ExistingImage,
  ImagePickerComponent,
} from '../shared/image-picker.component';
import { findByName } from '../shared/name-utils';

@Component({
  selector: 'app-new-food-item-form',
  imports: [
    FormsModule,
    AutofocusDirective,
    IconComponent,
    ImagePickerComponent,
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
})
export class NewFoodItemFormComponent implements OnInit {
  protected readonly t = inject(I18n).t;
  private readonly ingredientStore = inject(IngredientStore);

  /** The created food */
  readonly saved = output<{ id: string }>();
  readonly cancelled = output<void>();

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  private readonly changes = inject(ChangeDetectorRef);

  name = '';
  description = '';
  readonly images = signal<File[]>([]);
  /** The photos the food has, minus the ones removed in the form */
  readonly existingImages = signal<ExistingImage[]>([]);
  private originalImages: ExistingImage[] = [];
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.ingredientStore.loadFoodItems();
    void this.loadRecord();
  }

  private async loadRecord(): Promise<void> {
    const id = this.editId();
    const food = id ? await this.ingredientStore.getFoodItem(id) : null;
    if (!food) return;

    this.name = food.name;
    this.description = food.description;
    this.originalImages = food.images;
    this.existingImages.set(food.images);
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
      const id = this.editId();
      const food = id
        ? await this.ingredientStore.updateFoodItem(id, {
            name: this.name.trim(),
            description: this.description.trim(),
            addedImages: this.images(),
            removedImages: this.originalImages
              .filter((image) => !this.existingImages().includes(image))
              .map((image) => image.name),
          })
        : await this.ingredientStore.createFoodItem(
            this.name.trim(),
            this.description.trim(),
            this.images(),
          );
      this.saved.emit(food);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
