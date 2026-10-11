import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IngredientStore } from './ingredient-store';
import { UiStore } from '../shared/ui-store';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-new-food-item-form',
  imports: [FormsModule, IconComponent],
  template: `
    <div class="form-header">
      <button
        type="button"
        class="back-btn"
        (click)="cancel()"
        aria-label="Back"
      >
        <app-icon name="back" />
      </button>
      <h2>New Food Item</h2>
    </div>

    <form class="card" (ngSubmit)="save()" #f="ngForm">
      <div class="field">
        <label for="name">Name *</label>
        <input id="name" name="name" [(ngModel)]="name" required />
      </div>

      <div class="field">
        <label for="description">Description</label>
        <textarea
          id="description"
          name="description"
          [(ngModel)]="description"
          rows="3"
        ></textarea>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="actions">
        <button type="button" class="secondary" (click)="cancel()">
          Cancel
        </button>
        <button type="submit" [disabled]="!name.trim() || isSaving()">
          {{ isSaving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  `,
})
export class NewFoodItemFormComponent {
  private readonly ingredientStore = inject(IngredientStore);
  private readonly uiStore = inject(UiStore);

  name = '';
  description = '';
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  cancel(): void {
    this.uiStore.goHome();
  }

  async save(): Promise<void> {
    if (!this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.ingredientStore.createFoodItem(
        this.name.trim(),
        this.description.trim(),
      );
      this.uiStore.goHome();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
