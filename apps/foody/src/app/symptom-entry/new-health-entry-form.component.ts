import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SymptomEntryStore } from './symptom-entry-store';
import { SymptomStore } from './symptom-store';
import { UiStore } from '../shared/ui-store';
import { IconComponent } from '../shared/icon.component';
import { QuickAddComponent } from '../shared/quick-add.component';
import {
  fromDateAndTime,
  toDateInputValue,
  toPocketBaseDate,
  toTimeInputValue,
} from '../shared/date-utils';

@Component({
  selector: 'app-new-health-entry-form',
  imports: [FormsModule, IconComponent, QuickAddComponent],
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
      <h2>Log Symptom</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="symptom">Symptom *</label>
        <select id="symptom" name="symptom" [(ngModel)]="symptomId" required>
          <option value="">— Select —</option>
          @for (s of symptomStore.symptoms(); track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
        <app-quick-add
          label="symptom type"
          placeholder="e.g. headache"
          [create]="addSymptom"
        />
      </div>

      <div class="field">
        <label for="discomfort">Discomfort Level (1–100)</label>
        <input
          type="number"
          id="discomfort"
          name="discomfort"
          [(ngModel)]="discomfortLevel"
          min="1"
          max="100"
          placeholder="optional"
        />
      </div>

      <div class="field">
        <label for="comment">Comment</label>
        <textarea
          id="comment"
          name="comment"
          [(ngModel)]="comment"
          rows="3"
          placeholder="optional"
        ></textarea>
      </div>

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
        <button
          type="submit"
          [disabled]="!symptomId() || !date || !time || isSaving()"
        >
          {{ isSaving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  `,
})
export class NewHealthEntryFormComponent implements OnInit {
  readonly symptomStore = inject(SymptomStore);
  private readonly symptomEntryStore = inject(SymptomEntryStore);
  private readonly uiStore = inject(UiStore);

  // Signal, as it is also set after creating a symptom type
  readonly symptomId = signal('');
  discomfortLevel: number | null = null;
  comment = '';
  date = toDateInputValue(new Date());
  time = toTimeInputValue(new Date());

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.symptomStore.loadSymptoms();
  }

  readonly addSymptom = async (name: string): Promise<void> => {
    const symptom = await this.symptomStore.createSymptom(name, '');
    this.symptomId.set(symptom.id);
  };

  cancel(): void {
    this.uiStore.goHome();
  }

  async save(): Promise<void> {
    if (!this.symptomId() || !this.date || !this.time || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.symptomEntryStore.createSymptomEntry({
        date: toPocketBaseDate(fromDateAndTime(this.date, this.time)),
        symptomId: this.symptomId(),
        discomfortLevel: this.discomfortLevel,
        comment: this.comment.trim() || undefined,
      });
      this.uiStore.goHome();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
