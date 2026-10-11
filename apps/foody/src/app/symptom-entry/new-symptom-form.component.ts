import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SymptomStore } from './symptom-store';
import { UiStore } from '../shared/ui-store';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-new-symptom-form',
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
      <h2>New Symptom Type</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="name">Name *</label>
        <input id="name" name="name" [(ngModel)]="name" required />
      </div>

      <div class="field">
        <label for="comment">Comment</label>
        <textarea
          id="comment"
          name="comment"
          [(ngModel)]="comment"
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
export class NewSymptomFormComponent {
  private readonly symptomStore = inject(SymptomStore);
  private readonly uiStore = inject(UiStore);

  name = '';
  comment = '';
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
      await this.symptomStore.createSymptom(
        this.name.trim(),
        this.comment.trim(),
      );
      this.uiStore.goHome();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
