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
import { parseKilograms, WeightStore } from './weight-store';

/**
 * Logs the body weight
 */
@Component({
  selector: 'app-weight-form',
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
      <h2>{{ editId() ? t().editWeight : t().logWeight }}</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="weight-kilograms">{{ t().weightInKilograms }} *</label>
        <!-- Text, as a number field rejects the comma in some browsers -->
        <input
          id="weight-kilograms"
          name="kilograms"
          inputmode="decimal"
          autocomplete="off"
          appAutofocus
          [(ngModel)]="kilograms"
          required
          [placeholder]="t().weightPlaceholder"
        />
      </div>

      <div class="field-row">
        <div class="field">
          <label for="weight-date">{{ t().day }} *</label>
          <input
            type="date"
            id="weight-date"
            name="date"
            [(ngModel)]="date"
            required
          />
        </div>
        <div class="field">
          <label for="weight-time">{{ t().time }} *</label>
          <input
            type="time"
            id="weight-time"
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
export class WeightFormComponent implements OnInit {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly uiStore = inject(UiStore);
  private readonly store = inject(WeightStore);
  private readonly changes = inject(ChangeDetectorRef);

  /** The weight to change; without it a new one is logged */
  readonly editId = input<string | null>(null);

  kilograms = '';
  // A new weight is meant for the day that is shown
  date = toDateInputValue(this.uiStore.selectedDay());
  time = toTimeInputValue(new Date());

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.editId();
    const weight = id ? await this.store.getWeight(id) : null;
    if (!weight) return;

    const date = fromPocketBaseDate(weight.date);
    this.kilograms = this.i18n.formatNumber(weight.kilograms);
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
    return (
      parseKilograms(this.kilograms) !== null && !!this.date && !!this.time
    );
  }

  async save(): Promise<void> {
    const kilograms = parseKilograms(this.kilograms);
    if (kilograms === null || !this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const day = fromDateAndTime(this.date, this.time);
      const weight = { date: toPocketBaseDate(day), kilograms };
      const savedId = id
        ? (await this.store.updateWeight(id, weight), id)
        : await this.store.createWeight(weight);
      this.uiStore.done(savedId, day);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
