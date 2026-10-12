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
import { ConfirmService } from '../shared/confirm/confirm.service';
import { RowDirective } from '../shared/keyboard/row.directive';
import {
  FollowUpSummaryComponent,
  followUpTime,
} from './follow-up-summary.component';
import { SymptomEntryStore, SymptomFollowUp } from './symptom-entry-store';
import { SymptomFollowUpFormComponent } from './symptom-follow-up-form.component';
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
    SymptomFollowUpFormComponent,
    FollowUpSummaryComponent,
    RowDirective,
  ],
  template: `
    @if (isCreatingSymptom()) {
      <app-new-symptom-form
        (saved)="symptomCreated($event.id)"
        (cancelled)="isCreatingSymptom.set(false)"
      />
    }

    @if (followUpForm(); as form) {
      <app-symptom-follow-up-form
        [entryId]="editId()"
        [editId]="form.editId"
        (closed)="followUpClosed()"
      />
    }

    <!-- Hidden instead of removed, so the input is kept while creating -->
    <div [hidden]="isCreatingSymptom() || !!followUpForm()">
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

      <!-- How the symptom went on belongs to the entry, so it is changed
           here. A new entry has to be saved first. -->
      @if (editId()) {
        <section class="follow-ups">
          <h3><app-icon name="history" /> {{ t().followUp }}</h3>
          <div class="card">
            @if (followUps().length > 0) {
              <ul class="entry-list">
                @for (followUp of followUps(); track followUp.id) {
                  <li
                    class="entry"
                    appRow
                    (rowOpen)="followUpForm.set({ editId: followUp.id })"
                    (rowEdit)="followUpForm.set({ editId: followUp.id })"
                    (rowDelete)="removeFollowUp(followUp)"
                  >
                    <app-follow-up-summary
                      class="content"
                      [followUp]="followUp"
                      [start]="entryDate()"
                    />
                    <button
                      type="button"
                      class="icon-btn"
                      (click)="followUpForm.set({ editId: followUp.id })"
                      [attr.aria-label]="t().editNamed(name(followUp))"
                    >
                      <app-icon name="edit" />
                    </button>
                    <button
                      type="button"
                      class="icon-btn danger"
                      (click)="removeFollowUp(followUp)"
                      [attr.aria-label]="t().deleteNamed(name(followUp))"
                    >
                      <app-icon name="trash" />
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="list-message">{{ t().noFollowUps }}</p>
            }
            <button
              type="button"
              class="add"
              (click)="followUpForm.set({ editId: null })"
            >
              <app-icon name="plus" /> {{ t().addFollowUp }}
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .follow-ups {
        margin-top: 24px;
      }

      h3 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 8px 4px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .card {
        overflow: hidden;
      }

      .add {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 48px;
        border: none;
        border-top: 1px solid var(--border);
        background: none;
        color: var(--primary);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
      }

      .add:hover {
        background: var(--primary-soft);
      }
    `,
  ],
})
export class NewHealthEntryFormComponent implements OnInit {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly confirm = inject(ConfirmService);
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

  /** How the symptom went on; only an entry that exists has follow-ups */
  protected readonly followUps = signal<SymptomFollowUp[]>([]);
  /** The time of the entry as it is stored, which the follow-ups refer to */
  protected readonly entryDate = signal('');
  /**
   * The form for a follow-up shown in place of this one, for a new one if
   * `editId` is null
   */
  protected readonly followUpForm = signal<{ editId: string | null } | null>(
    null,
  );

  ngOnInit(): void {
    this.symptomStore.loadSymptoms();
    void this.loadRecord();
    void this.loadFollowUps();
  }

  private async loadFollowUps(): Promise<void> {
    const id = this.editId();
    if (id) this.followUps.set(await this.symptomEntryStore.getFollowUps(id));
  }

  protected followUpClosed(): void {
    this.followUpForm.set(null);
    void this.loadFollowUps();
  }

  /** What a follow-up is called, e.g. when asking whether to delete it */
  protected name(followUp: SymptomFollowUp): string {
    const time = followUpTime(
      this.i18n,
      fromPocketBaseDate(this.entryDate()),
      fromPocketBaseDate(followUp.date),
    );
    return `${this.t().followUp} (${time})`;
  }

  protected async removeFollowUp(followUp: SymptomFollowUp): Promise<void> {
    await this.confirm.delete(
      { id: followUp.id, name: this.name(followUp) },
      () => this.symptomEntryStore.deleteFollowUp(followUp.id),
    );
    await this.loadFollowUps();
  }

  private async loadRecord(): Promise<void> {
    const id = this.editId();
    const entry = id ? await this.symptomEntryStore.getSymptomEntry(id) : null;
    if (!entry) return;

    this.entryDate.set(entry.date);
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
