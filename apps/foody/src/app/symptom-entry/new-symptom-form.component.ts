import { Component, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SymptomStore } from './symptom-store';
import { IconComponent } from '../shared/icon.component';
import { findByName } from '../shared/name-utils';

@Component({
  selector: 'app-new-symptom-form',
  imports: [FormsModule, IconComponent],
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
      <h2>New Symptom</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="symptom-name">Name *</label>
        <input
          id="symptom-name"
          name="name"
          [(ngModel)]="name"
          placeholder="e.g. headache"
          required
        />
        @if (existing(); as duplicate) {
          <p class="warning">
            <span>
              A symptom named <strong>{{ duplicate.name }}</strong> already
              exists.
            </span>
            <button type="button" class="link" (click)="saved.emit(duplicate)">
              Use existing
            </button>
          </p>
        }
      </div>

      <div class="field">
        <label for="symptom-comment">Comment</label>
        <textarea
          id="symptom-comment"
          name="comment"
          [(ngModel)]="comment"
          rows="3"
          placeholder="optional"
        ></textarea>
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
export class NewSymptomFormComponent implements OnInit {
  private readonly symptomStore = inject(SymptomStore);

  /** The created symptom */
  readonly saved = output<{ id: string }>();
  readonly cancelled = output<void>();

  name = '';
  comment = '';
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.symptomStore.loadSymptoms();
  }

  /** A record with the entered name, to warn about the duplicate */
  protected existing() {
    return findByName(this.symptomStore.symptoms(), this.name);
  }

  async save(): Promise<void> {
    if (!this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const symptom = await this.symptomStore.createSymptom(
        this.name.trim(),
        this.comment.trim(),
      );
      this.saved.emit(symptom);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
