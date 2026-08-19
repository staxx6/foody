import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SymptomEntryStore } from './symptom-entry-store';
import { SymptomStore } from './symptom-store';
import { UiStore } from '../shared/ui-store';

@Component({
  selector: 'app-new-health-entry-form',
  imports: [FormsModule],
  template: `
    <div class="form-header">
      <button class="back-btn" (click)="cancel()">← Back</button>
      <h2>New Health Entry</h2>
    </div>

    <form (ngSubmit)="save()">
      <div class="field">
        <label for="symptom">Symptom *</label>
        <select id="symptom" name="symptom" [(ngModel)]="symptomId" required>
          <option value="">— Select —</option>
          @for (s of symptomStore.symptoms(); track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
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
        <textarea id="comment" name="comment" [(ngModel)]="comment" rows="3" placeholder="optional"></textarea>
      </div>

      <div class="field">
        <label for="date">Date *</label>
        <input type="datetime-local" id="date" name="date" [(ngModel)]="date" required />
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="actions">
        <button type="button" class="secondary" (click)="cancel()">Cancel</button>
        <button type="submit" [disabled]="!symptomId || isSaving()">
          {{ isSaving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host { display: block; }

    .form-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .back-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #4caf50;
      font-size: 0.95rem;
      padding: 0;
    }

    h2 { margin: 0; font-size: 1.1rem; }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 16px;
    }

    label { font-size: 0.85rem; color: #666; font-weight: 500; }

    input, select, textarea {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 1rem;
      outline: none;
      font-family: inherit;
      background: #fff;
    }

    input:focus, select:focus, textarea:focus { border-color: #4caf50; }

    .error { color: #e53935; font-size: 0.85rem; }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    button[type="submit"] {
      flex: 1;
      padding: 12px;
      background: #4caf50;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
    }

    button[type="submit"]:disabled { opacity: 0.5; cursor: not-allowed; }

    .secondary {
      flex: 1;
      padding: 12px;
      background: none;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
    }
  `],
})
export class NewHealthEntryFormComponent implements OnInit {
  readonly symptomStore = inject(SymptomStore);
  private readonly symptomEntryStore = inject(SymptomEntryStore);
  private readonly uiStore = inject(UiStore);

  symptomId = '';
  discomfortLevel: number | null = null;
  comment = '';
  date = new Date().toISOString().slice(0, 16);

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.symptomStore.loadSymptoms();
  }

  cancel(): void {
    this.uiStore.goHome();
  }

  async save(): Promise<void> {
    if (!this.symptomId || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      // PocketBase expects "YYYY-MM-DD HH:MM:SS.000Z"
      const pbDate = this.date.replace('T', ' ') + ':00.000Z';
      await this.symptomEntryStore.createSymptomEntry({
        date: pbDate,
        symptomId: this.symptomId,
        discomfortLevel: this.discomfortLevel,
        comment: this.comment.trim() || undefined,
      });
      await this.symptomEntryStore.loadTodayEntries();
      this.uiStore.goHome();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
