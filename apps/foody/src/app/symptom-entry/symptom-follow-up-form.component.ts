import {
  ChangeDetectorRef,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  elapsed,
  fromDateAndTime,
  fromPocketBaseDate,
  toDateInputValue,
  toPocketBaseDate,
  toTimeInputValue,
} from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import {
  LevelChipComponent,
  LevelPickerComponent,
  levelStep,
} from '../shared/level.component';
import { AutofocusDirective } from '../shared/keyboard/autofocus.directive';
import { followUpTime } from './follow-up-summary.component';
import {
  FollowUpCourse,
  SymptomEntryStore,
  SymptomFollowUp,
} from './symptom-entry-store';

/**
 * Logs how a symptom is some time after it was logged, e.g. better after
 * three hours but not gone
 */
@Component({
  selector: 'app-symptom-follow-up-form',
  imports: [
    FormsModule,
    IconComponent,
    AutofocusDirective,
    LevelChipComponent,
    LevelPickerComponent,
  ],
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
      <h2>{{ editId() ? t().editFollowUp : t().addFollowUp }}</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      @if (entry(); as entry) {
        <div class="about">
          <p>
            <app-icon name="symptom" />
            <strong>{{ entry.name }}</strong>
            <span>{{ i18n.formatDateTime(entry.date) }}</span>
            @if (entry.level; as level) {
              <app-level-chip [level]="level" />
            }
          </p>
          <!-- Where it stands, which the new level is compared with -->
          @if (before(); as before) {
            @if (before.date) {
              <p class="last">
                <app-icon name="history" />
                <span>{{ t().lastStatus }}</span>
                <span>{{ when(before.date) }}</span>
                @if (before.level) {
                  <app-level-chip [level]="before.level" />
                } @else {
                  <span class="chip gone">{{ t().courses.gone }}</span>
                }
              </p>
            }
          }
        </div>
      }

      <div class="field">
        <span class="label" id="follow-up-level-label">
          {{ t().discomfortLevelNow }} *
        </span>
        <app-level-picker
          appAutofocus
          labelledBy="follow-up-level-label"
          [withZero]="true"
          [(value)]="discomfortLevel"
        />
        <span class="note">
          @if (before(); as before) {
            {{ t().levelBefore(before.step) }}
            @if (course(); as course) {
              · {{ t().courses[course] }}
            }
          } @else if (course() === 'gone') {
            {{ t().courses.gone }}
          }
        </span>
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
      <p class="when">
        <button type="button" class="link" (click)="setNow()">
          {{ t().setToNow }}
        </button>
        @if (duration(); as duration) {
          <span class="note">
            {{ t().afterDuration(duration.hours, duration.minutes) }}
          </span>
        }
      </p>

      <div class="field">
        <label for="follow-up-comment">{{ t().comment }}</label>
        <textarea
          id="follow-up-comment"
          name="comment"
          [(ngModel)]="comment"
          rows="2"
          [placeholder]="t().optional"
        ></textarea>
      </div>

      @if (isTooEarly()) {
        <p class="error">{{ t().followUpTooEarly }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="actions">
        <button type="button" class="secondary" (click)="cancelled.emit()">
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
      /* The symptom entry the follow-up belongs to, and its last status */
      .about {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0 0 18px;
        padding: 10px 12px;
        border-radius: var(--radius);
        background: var(--bg);
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      .about p {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 10px;
        margin: 0;
      }

      .about strong {
        color: var(--text);
      }

      .chip.gone {
        background: var(--surface);
        color: var(--success);
      }

      .when {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 18px;
      }

      .note {
        font-size: 0.85rem;
        color: var(--text-muted);
      }
    `,
  ],
})
export class SymptomFollowUpFormComponent implements OnInit {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly store = inject(SymptomEntryStore);
  private readonly changes = inject(ChangeDetectorRef);

  /** The symptom entry a new follow-up is for */
  readonly entryId = input<string | null>(null);
  /** The follow-up to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  /** Whoever shows the form takes it away after one of them */
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  /** The symptom entry the follow-up belongs to */
  protected readonly entry = signal<{
    id: string;
    name: string;
    date: Date;
    level: number | null;
  } | null>(null);

  /** The other follow-ups of the entry, which the course is measured by */
  private readonly others = signal<SymptomFollowUp[]>([]);
  /** The level now; 0 if the symptom is gone */
  protected readonly discomfortLevel = signal<number | null>(null);
  comment = '';
  // A follow-up is usually entered when it is noticed
  date = toDateInputValue(new Date());
  time = toTimeInputValue(new Date());

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const editId = this.editId();
    const followUp = editId ? await this.store.getFollowUp(editId) : null;
    if (followUp) {
      const date = fromPocketBaseDate(followUp.date);
      this.discomfortLevel.set(
        followUp.course === 'gone' ? 0 : followUp.discomfortLevel,
      );
      this.comment = followUp.comment;
      this.date = toDateInputValue(date);
      this.time = toTimeInputValue(date);
    }

    const entryId = followUp?.entryId ?? this.entryId();
    const entry = entryId ? await this.store.getSymptomEntry(entryId) : null;
    // Deleted in the meantime, e.g. on another device
    if (!entryId || !entry) return this.cancelled.emit();

    this.others.set(
      (await this.store.getFollowUps(entryId)).filter(
        (other) => other.id !== editId,
      ),
    );
    this.entry.set({
      id: entryId,
      name: entry.symptomName,
      date: fromPocketBaseDate(entry.date),
      level: entry.discomfortLevel ?? null,
    });
    // A new follow-up starts where it stands, so only a change is entered
    if (!followUp) this.discomfortLevel.set(this.before()?.level ?? null);
    this.changes.markForCheck();
  }

  /**
   * The level before this follow-up: of the follow-up before it, or of the
   * entry. Null if neither has one.
   * @returns the level as stored, 0 if it was gone; the step of it; the time
   *   of the follow-up, null if it is the level of the entry
   */
  protected before(): {
    level: number;
    step: number;
    date: Date | null;
  } | null {
    const entry = this.entry();
    const moment = this.moment()?.getTime() ?? Infinity;
    const earlier = this.others()
      .filter((other) => fromPocketBaseDate(other.date).getTime() <= moment)
      // Follow-ups without a level say nothing about it
      .filter((other) => other.course === 'gone' || other.discomfortLevel)
      .pop();
    if (earlier) {
      const level =
        earlier.course === 'gone' ? 0 : (earlier.discomfortLevel ?? 0);
      return {
        level,
        step: level ? levelStep(level) : 0,
        date: fromPocketBaseDate(earlier.date),
      };
    }
    return entry?.level
      ? { level: entry.level, step: levelStep(entry.level), date: null }
      : null;
  }

  /** When an earlier follow-up was, e.g. "14:30 · after 3 h" */
  protected when(date: Date): string {
    const entry = this.entry();
    return entry ? followUpTime(this.i18n, entry.date, date) : '';
  }

  /** How it developed, which follows from the level now and the one before */
  protected course(): FollowUpCourse | null {
    const level = this.discomfortLevel();
    if (level === null) return null;
    if (level === 0) return 'gone';

    const before = this.before();
    const now = levelStep(level);
    if (!before || now === before.step) return 'same';
    return now < before.step ? 'better' : 'worse';
  }

  /** Sets day and time to the current moment */
  protected setNow(): void {
    const now = new Date();
    this.date = toDateInputValue(now);
    this.time = toTimeInputValue(now);
  }

  private moment(): Date | null {
    return this.date && this.time
      ? fromDateAndTime(this.date, this.time)
      : null;
  }

  /** How long after the symptom entry the follow-up is */
  protected duration(): { hours: number; minutes: number } | null {
    const entry = this.entry();
    const moment = this.moment();
    if (!entry || !moment || this.isTooEarly()) return null;
    return elapsed(entry.date, moment);
  }

  protected isTooEarly(): boolean {
    const entry = this.entry();
    const moment = this.moment();
    return !!entry && !!moment && moment.getTime() < entry.date.getTime();
  }

  protected isValid(): boolean {
    return (
      !!this.entry() &&
      this.discomfortLevel() !== null &&
      !!this.moment() &&
      !this.isTooEarly()
    );
  }

  async save(): Promise<void> {
    const entry = this.entry();
    const moment = this.moment();
    const course = this.course();
    if (!entry || !moment || !course || !this.isValid() || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const followUp = {
        entryId: entry.id,
        date: toPocketBaseDate(moment),
        course,
        // A symptom that is gone has no level
        discomfortLevel: course === 'gone' ? null : this.discomfortLevel(),
        comment: this.comment.trim(),
      };
      await (id
        ? this.store.updateFollowUp(id, followUp)
        : this.store.createFollowUp(followUp));
      this.saved.emit();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
