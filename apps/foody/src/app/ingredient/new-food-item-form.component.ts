import { Component, inject, OnInit, output, signal } from '@angular/core';
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
        aria-label="Back"
      >
        <app-icon name="back" />
      </button>
      <h2>New Food</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="food-name">Name *</label>
        <input
          id="food-name"
          name="name"
          [(ngModel)]="name"
          placeholder="e.g. apple"
          required
        />
        @if (existing(); as duplicate) {
          <p class="warning">
            <span>
              A food named <strong>{{ duplicate.name }}</strong> already exists.
            </span>
            <button type="button" class="link" (click)="saved.emit(duplicate)">
              Use existing
            </button>
          </p>
        }
      </div>

      <div class="field">
        <label for="food-description">Description</label>
        <textarea
          id="food-description"
          name="description"
          [(ngModel)]="description"
          rows="3"
          placeholder="optional"
        ></textarea>
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
  `,
})
export class NewFoodItemFormComponent implements OnInit {
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
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
