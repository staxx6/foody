import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmountUnitStore } from '../shared/amount-unit-store';
import {
  fromDateAndTime,
  fromPocketBaseDate,
  toDateInputValue,
  toPocketBaseDate,
  toTimeInputValue,
} from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { SearchSelectComponent } from '../shared/search/search-select.component';
import { UiStore } from '../shared/ui-store';
import { MedicationEntryStore } from './medication-entry-store';
import { MedicationStore } from './medication-store';
import { NewMedicationFormComponent } from './new-medication-form.component';

/**
 * Logs that a medication was taken
 */
@Component({
  selector: 'app-log-medication-form',
  imports: [
    FormsModule,
    IconComponent,
    SearchSelectComponent,
    NewMedicationFormComponent,
  ],
  template: `
    @if (isCreating()) {
      <app-new-medication-form
        (saved)="created($event.id)"
        (cancelled)="isCreating.set(false)"
      />
    }

    <!-- Hidden instead of removed, so the input is kept while creating -->
    <div [hidden]="isCreating()">
      <div class="form-header">
        <button
          type="button"
          class="back-btn"
          (click)="uiStore.close()"
          [attr.aria-label]="t().back"
        >
          <app-icon name="back" />
        </button>
        <h2>{{ editId() ? t().editMedicationEntry : t().logMedication }}</h2>
      </div>

      <form class="card" (ngSubmit)="save()">
        <div class="field">
          <label for="medication">{{ t().medication }} *</label>
          <app-search-select
            inputId="medication"
            [options]="medicationOptions()"
            [value]="medicationId()"
            (valueChange)="select($event)"
            [placeholder]="t().selectMedication"
          />
          <button type="button" class="link" (click)="isCreating.set(true)">
            {{ t().createNewMedication }}
          </button>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="medication-amount">{{ t().amount }}</label>
            <input id="medication-amount" name="amount" [(ngModel)]="amount" />
          </div>
          <div class="field">
            <label for="medication-unit">{{ t().unit }}</label>
            <app-search-select
              inputId="medication-unit"
              [options]="unitOptions()"
              [(value)]="amountUnitId"
              [placeholder]="t().search"
            />
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="date">{{ t().day }} *</label>
            <input
              type="date"
              id="date"
              name="date"
              [(ngModel)]="date"
              required
            />
          </div>
          <div class="field">
            <label for="time">{{ t().time }} *</label>
            <input
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

        <div class="field">
          <label for="medication-comment">{{ t().comment }}</label>
          <textarea
            id="medication-comment"
            name="comment"
            [(ngModel)]="comment"
            rows="2"
            [placeholder]="t().medicationCommentPlaceholder"
          ></textarea>
        </div>

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
    </div>
  `,
  styles: [
    `
      .field-row {
        margin-bottom: 12px;
      }
    `,
  ],
})
export class LogMedicationFormComponent implements OnInit {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly uiStore = inject(UiStore);
  private readonly medicationStore = inject(MedicationStore);
  private readonly entryStore = inject(MedicationEntryStore);
  private readonly unitStore = inject(AmountUnitStore);
  private readonly changes = inject(ChangeDetectorRef);

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);

  /** The medications, with their strength to tell them apart */
  protected readonly medicationOptions = computed(() =>
    this.medicationStore.medications().map((medication) => ({
      id: medication.id,
      name: [medication.name, medication.strength].filter(Boolean).join(' '),
    })),
  );
  protected readonly unitOptions = computed(() =>
    this.unitStore
      .units()
      .map((unit) => ({ id: unit.id, name: this.i18n.name(unit) })),
  );

  // Signals, as they are also set after loading and creating
  readonly medicationId = signal('');
  readonly amountUnitId = signal('');
  amount = '';
  comment = '';
  // A new entry is meant for the day that is shown
  date = toDateInputValue(this.uiStore.selectedDay());
  time = toTimeInputValue(new Date());

  /** The form for a new medication shown in place of this one */
  protected readonly isCreating = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.medicationStore.loadMedications(),
      this.unitStore.loadUnits(),
    ]);

    const id = this.editId();
    const entry = id ? await this.entryStore.getEntry(id) : null;
    if (entry) {
      const date = fromPocketBaseDate(entry.date);
      this.medicationId.set(entry.medicationId);
      this.amount = entry.amount;
      this.amountUnitId.set(entry.amountUnitId);
      this.comment = entry.comment;
      this.date = toDateInputValue(date);
      this.time = toTimeInputValue(date);
    }
    this.changes.markForCheck();
  }

  /** Choosing a medication suggests its usual dose */
  protected select(medicationId: string): void {
    this.medicationId.set(medicationId);
    const medication = this.medicationStore
      .medications()
      .find((other) => other.id === medicationId);
    if (!medication) return;

    this.amount = medication.defaultAmount;
    this.amountUnitId.set(medication.defaultUnitId);
  }

  /** A medication that was created from here is selected right away */
  protected created(id: string): void {
    this.select(id);
    this.isCreating.set(false);
  }

  /** Sets day and time to the current moment */
  protected setNow(): void {
    const now = new Date();
    this.date = toDateInputValue(now);
    this.time = toTimeInputValue(now);
  }

  protected isValid(): boolean {
    return !!this.medicationId() && !!this.date && !!this.time;
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const entry = {
        date: toPocketBaseDate(fromDateAndTime(this.date, this.time)),
        medicationId: this.medicationId(),
        amount: this.amount.trim(),
        amountUnitId: this.amountUnitId(),
        comment: this.comment.trim(),
      };
      await (id
        ? this.entryStore.updateEntry(id, entry)
        : this.entryStore.createEntry(entry));
      this.uiStore.close();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
