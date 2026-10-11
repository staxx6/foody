import { Component, inject, OnInit, output, signal } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { FormsModule } from '@angular/forms';
import { IngredientStore } from './ingredient-store';
import { IconComponent } from '../shared/icon.component';
import { ImagePickerComponent } from '../shared/image-picker.component';
import { findByName } from '../shared/name-utils';

@Component({
  selector: 'app-new-food-item-form',
  imports: [FormsModule, IconComponent, ImagePickerComponent],
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
      <h2>{{ t().newFood }}</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="food-name">{{ t().name }} *</label
        ><input
          id="food-name"
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
        ><app-image-picker [(files)]="images" />
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

  name = '';
  description = '';
  readonly images = signal<File[]>([]);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.ingredientStore.loadFoodItems();
  }

  /** A record with the entered name, to warn about the duplicate */
  protected existing() {
    return findByName(this.ingredientStore.foodItems(), this.name);
  }

  async save(): Promise<void> {
    if (!this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const food = await this.ingredientStore.createFoodItem(
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
