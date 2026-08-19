import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SymptomStore } from './symptom-store';
import { UiStore } from '../shared/ui-store';

@Component({
  selector: 'app-new-symptom-form',
  imports: [FormsModule],
  template: `
    <div class="form-header">
      <button class="back-btn" (click)="cancel()">← Back</button>
      <h2>New Symptom</h2>
    </div>

    <form (ngSubmit)="save()">
      <div class="field">
        <label for="name">Name *</label>
        <input id="name" name="name" [(ngModel)]="name" required autofocus />
      </div>

      <div class="field">
        <label for="comment">Comment</label>
        <textarea id="comment" name="comment" [(ngModel)]="comment" rows="3"></textarea>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="actions">
        <button type="button" class="secondary" (click)="cancel()">Cancel</button>
        <button type="submit" [disabled]="!name.trim() || isSaving()">
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

    input, textarea {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 1rem;
      outline: none;
      font-family: inherit;
    }

    input:focus, textarea:focus { border-color: #4caf50; }

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
      await this.symptomStore.createSymptom(this.name.trim(), this.comment.trim());
      this.uiStore.goHome();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Saving failed');
      this.isSaving.set(false);
    }
  }
}
