import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectorRef,
  input,
} from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { AutofocusDirective } from '../shared/keyboard/autofocus.directive';
import { FormsModule } from '@angular/forms';
import { SymptomEntryStore } from './symptom-entry-store';
import { SymptomStore } from './symptom-store';
import { UiStore } from '../shared/ui-store';
import { IconComponent } from '../shared/icon.component';
import { NewSymptomFormComponent } from './new-symptom-form.component';
import {
  fromDateAndTime,
  fromPocketBaseDate,
  toDateInputValue,
  toPocketBaseDate,
  toTimeInputValue,
} from '../shared/date-utils';
import { SearchSelectComponent } from '../shared/search/search-select.component';

@Component({
  selector: 'app-new-health-entry-form',
  imports: [
    FormsModule,
    AutofocusDirective,
    SearchSelectComponent,
    IconComponent,
    NewSymptomFormComponent,
  ],
  template: `
    @if (isCreatingSymptom()) {
      <app-new-symptom-form
        (saved)="symptomCreated($event.id)"
        (cancelled)="isCreatingSymptom.set(false)"
      />
    }

    <!-- Hidden instead of removed, so the input is kept while creating -->
    <div [hidden]="isCreatingSymptom()">
      <div class="form-header">
        <button
          type="button"
          class="back-btn"
          (click)="cancel()"
          [attr.aria-label]="t().back"
        >
          <app-icon name="back" />
        </button>
        <h2>{{ editId() ? t().editSymptomEntry : t().logSymptom }}</h2>
      </div>

      <form class="card" (ngSubmit)="save()">
        <div class="field">
          <label for="symptom">{{ t().symptom }} *</label
          ><app-search-select
            inputId="symptom"
            [appAutofocus]="!editId()"
            [options]="symptomStore.symptoms()"
            [(value)]="symptomId"
            [placeholder]="t().selectSymptom"
          />
          <button
            type="button"
            class="link"
            (click)="isCreatingSymptom.set(true)"
          >
            {{ t().createNewSymptom }}
          </button>
        </div>

        <div class="field">
          <label for="discomfort">{{ t().discomfortLevelRange }}</label
          ><input
            type="number"
            id="discomfort"
            name="discomfort"
            [(ngModel)]="discomfortLevel"
            min="1"
            max="100"
            [placeholder]="t().optional"
          />
        </div>

        <div class="field">
          <label for="comment">{{ t().comment }}</label
          ><textarea
            id="comment"
            name="comment"
            [(ngModel)]="comment"
            rows="3"
            [placeholder]="t().optional"
          ></textarea>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="date">{{ t().day }} *</label
            ><input
              type="date"
              id="date"
              name="date"
              [(ngModel)]="date"
              required
            />
          </div>
          <div class="field">
            <label for="time">{{ t().time }} *</label
            ><input
              type="time"
              id="time"
              name="time"
              [(ngModel)]="time"
              required
            />
          </div>
        </div>
        <button type="button" class="link" (click)="setNow()">
          {{ t().setToNow }}
        </button>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <div class="actions">
          <button type="button" class="secondary" (click)="cancel()">
            {{ t().cancel }}
          </button>
          <button
            type="submit"
            [disabled]="!symptomId() || !date || !time || isSaving()"
          >
            {{ isSaving() ? t().saving : t().save }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class NewHealthEntryFormComponent implements OnInit {
  protected readonly t = inject(I18n).t;
  readonly symptomStore = inject(SymptomStore);
  private readonly symptomEntryStore = inject(SymptomEntryStore);
  private readonly uiStore = inject(UiStore);

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  private readonly changes = inject(ChangeDetectorRef);

  // Signal, as it is also set after creating a symptom
  readonly symptomId = signal('');
  discomfortLevel: number | null = null;
  comment = '';
  // A new entry is meant for the day that is shown
  date = toDateInputValue(this.uiStore.selectedDay());
  time = toTimeInputValue(new Date());

  /** The form for a new symptom shown in place of this one */
  protected readonly isCreatingSymptom = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.symptomStore.loadSymptoms();
    void this.loadRecord();
  }

  private async loadRecord(): Promise<void> {
    const id = this.editId();
    const entry = id ? await this.symptomEntryStore.getSymptomEntry(id) : null;
    if (!entry) return;

    const date = fromPocketBaseDate(entry.date);
    this.symptomId.set(entry.symptomId);
    this.discomfortLevel = entry.discomfortLevel ?? null;
    this.comment = entry.comment ?? '';
    this.date = toDateInputValue(date);
    this.time = toTimeInputValue(date);
    this.changes.markForCheck();
  }

  /** A symptom that was created from here is selected right away */
  protected symptomCreated(id: string): void {
    this.symptomId.set(id);
    this.isCreatingSymptom.set(false);
  }

  /** Sets day and time to the current moment */
  protected setNow(): void {
    const now = new Date();
    this.date = toDateInputValue(now);
    this.time = toTimeInputValue(now);
  }

  cancel(): void {
    this.uiStore.close();
  }

  async save(): Promise<void> {
    if (!this.symptomId() || !this.date || !this.time || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const entry = {
        date: toPocketBaseDate(fromDateAndTime(this.date, this.time)),
        symptomId: this.symptomId(),
        discomfortLevel: this.discomfortLevel,
        comment: this.comment.trim() || undefined,
      };
      await (id
        ? this.symptomEntryStore.updateSymptomEntry(id, entry)
        : this.symptomEntryStore.createSymptomEntry(entry));
      this.uiStore.close();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
