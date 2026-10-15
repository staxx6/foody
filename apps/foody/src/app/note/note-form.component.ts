import {
  ChangeDetectorRef,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  fromDateAndTime,
  fromPocketBaseDate,
  toDateInputValue,
  toPocketBaseDate,
  toTimeInputValue,
} from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { AutofocusDirective } from '../shared/keyboard/autofocus.directive';
import { IconComponent } from '../shared/icon.component';
import { UiStore } from '../shared/ui-store';
import { NoteStore } from './note-store';

/**
 * Writes a note on a day, e.g. why one felt bad or why nothing was logged
 */
@Component({
  selector: 'app-note-form',
  imports: [FormsModule, AutofocusDirective, IconComponent],
  template: `
    <div class="form-header">
      <button
        type="button"
        class="back-btn"
        (click)="uiStore.close()"
        [attr.aria-label]="t().back"
      >
        <app-icon name="back" />
      </button>
      <h2>{{ editId() ? t().editNote : t().writeNote }}</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="note-text">{{ t().note }} *</label>
        <textarea
          id="note-text"
          name="text"
          appAutofocus
          [(ngModel)]="text"
          rows="5"
          required
          [placeholder]="t().notePlaceholder"
        ></textarea>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="note-date">{{ t().day }} *</label>
          <input
            type="date"
            id="note-date"
            name="date"
            [(ngModel)]="date"
            required
          />
        </div>
        <div class="field">
          <label for="note-time">{{ t().time }} *</label>
          <input
            type="time"
            id="note-time"
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
        <button type="button" class="secondary" (click)="uiStore.close()">
          {{ t().cancel }}
        </button>
        <button type="submit" [disabled]="!isValid() || isSaving()">
          {{ isSaving() ? t().saving : t().save }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .field-row {
        margin-bottom: 12px;
      }
    `,
  ],
})
export class NoteFormComponent implements OnInit {
  protected readonly t = inject(I18n).t;
  protected readonly uiStore = inject(UiStore);
  private readonly store = inject(NoteStore);
  private readonly changes = inject(ChangeDetectorRef);

  /** The note to change; without it a new one is written */
  readonly editId = input<string | null>(null);

  text = '';
  // A new note is meant for the day that is shown
  date = toDateInputValue(this.uiStore.selectedDay());
  time = toTimeInputValue(new Date());

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.editId();
    const note = id ? await this.store.getNote(id) : null;
    if (!note) return;

    const date = fromPocketBaseDate(note.date);
    this.text = note.text;
    this.date = toDateInputValue(date);
    this.time = toTimeInputValue(date);
    this.changes.markForCheck();
  }

  /** Sets day and time to the current moment */
  protected setNow(): void {
    const now = new Date();
    this.date = toDateInputValue(now);
    this.time = toTimeInputValue(now);
  }

  protected isValid(): boolean {
    return !!this.text.trim() && !!this.date && !!this.time;
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const day = fromDateAndTime(this.date, this.time);
      const note = { date: toPocketBaseDate(day), text: this.text.trim() };
      const savedId = id
        ? (await this.store.updateNote(id, note), id)
        : await this.store.createNote(note);
      this.uiStore.done(savedId, day);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
