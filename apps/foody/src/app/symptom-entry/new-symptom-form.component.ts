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
        [attr.aria-label]="t().back"
      >
        <app-icon name="back" />
      </button>
      <h2>{{ editId() ? t().editSymptom : t().newSymptom }}</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="symptom-name">{{ t().name }} *</label
        ><input
          id="symptom-name"
          name="name"
          [(ngModel)]="name"
          [placeholder]="t().symptomPlaceholder"
          required
        />
        @if (existing(); as duplicate) {
          <p class="warning">
            <span>{{ t().symptomExists(duplicate.name) }}</span
            ><button type="button" class="link" (click)="saved.emit(duplicate)">
              {{ t().useExisting }}
            </button>
          </p>
        }
      </div>

      <div class="field">
        <label for="symptom-comment">{{ t().comment }}</label
        ><textarea
          id="symptom-comment"
          name="comment"
          [(ngModel)]="comment"
          rows="3"
          [placeholder]="t().optional"
        ></textarea>
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
export class NewSymptomFormComponent implements OnInit {
  protected readonly t = inject(I18n).t;
  private readonly symptomStore = inject(SymptomStore);

  /** The created symptom */
  readonly saved = output<{ id: string }>();
  readonly cancelled = output<void>();

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  private readonly changes = inject(ChangeDetectorRef);

  name = '';
  comment = '';
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.symptomStore.loadSymptoms();
    void this.loadRecord();
  }

  private async loadRecord(): Promise<void> {
    const id = this.editId();
    const symptom = id ? await this.symptomStore.getSymptom(id) : null;
    if (!symptom) return;

    this.name = symptom.name;
    this.comment = symptom.comment;
    this.changes.markForCheck();
  }

  /** A record with the entered name, to warn about the duplicate */
  protected existing() {
    return findByName(
      this.symptomStore
        .symptoms()
        .filter((symptom) => symptom.id !== this.editId()),
      this.name,
    );
  }

  async save(): Promise<void> {
    if (!this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const symptom = id
        ? await this.symptomStore.updateSymptom(
            id,
            this.name.trim(),
            this.comment.trim(),
          )
        : await this.symptomStore.createSymptom(
            this.name.trim(),
            this.comment.trim(),
          );
      this.saved.emit(symptom);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
