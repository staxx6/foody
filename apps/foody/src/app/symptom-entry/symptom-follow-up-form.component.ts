import {
  ChangeDetectorRef,
  Component,
  ElementRef,
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
import {
  FOLLOW_UP_COURSES,
  FollowUpCourse,
  SymptomEntryStore,
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
        <p class="about">
          <app-icon name="symptom" />
          <strong>{{ entry.name }}</strong>
          <span>{{ i18n.formatDateTime(entry.date) }}</span>
          @if (entry.level; as level) {
            <app-level-chip [level]="level" />
          }
        </p>
      }

      <div class="field">
        <span class="label" id="course-label"
          >{{ t().followUpQuestion }} *</span
        >
        <div class="toggle" role="radiogroup" aria-labelledby="course-label">
          @for (option of courses; track option) {
            <button
              type="button"
              role="radio"
              [class.active]="course() === option"
              [attr.aria-checked]="course() === option"
              [attr.tabindex]="course() === option ? 0 : -1"
              [attr.data-course]="option"
              [appAutofocus]="course() === option"
              (click)="course.set(option)"
              (keydown)="onCourseKey($event)"
            >
              {{ t().courses[option] }}
            </button>
          }
        </div>
      </div>

      @if (course() !== 'gone') {
        <div class="field">
          <span class="label" id="follow-up-level-label">
            {{ t().discomfortLevelRange }}
          </span>
          <app-level-picker
            labelledBy="follow-up-level-label"
            [(value)]="discomfortLevel"
          />
          @if (entry()?.level; as level) {
            <span class="note">{{ t().levelAtStart(step(level)) }}</span>
          }
        </div>
      }

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
      /* The symptom entry the follow-up belongs to */
      .about {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 10px;
        margin: 0 0 18px;
        padding: 10px 12px;
        border-radius: var(--radius);
        background: var(--bg);
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      .about strong {
        color: var(--text);
      }

      .toggle {
        grid-template-columns: repeat(4, 1fr);
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The symptom entry a new follow-up is for */
  readonly entryId = input<string | null>(null);
  /** The follow-up to change; without it a new one is created */
  readonly editId = input<string | null>(null);
  /** Whoever shows the form takes it away after one of them */
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly courses = FOLLOW_UP_COURSES;
  protected readonly step = levelStep;

  /** The symptom entry the follow-up belongs to */
  protected readonly entry = signal<{
    id: string;
    name: string;
    date: Date;
    level: number | null;
  } | null>(null);

  protected readonly course = signal<FollowUpCourse>('better');
  discomfortLevel: number | null = null;
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
      this.course.set(followUp.course);
      this.discomfortLevel = followUp.discomfortLevel;
      this.comment = followUp.comment;
      this.date = toDateInputValue(date);
      this.time = toTimeInputValue(date);
    }

    const entryId = followUp?.entryId ?? this.entryId();
    const entry = entryId ? await this.store.getSymptomEntry(entryId) : null;
    // Deleted in the meantime, e.g. on another device
    if (!entryId || !entry) return this.cancelled.emit();

    this.entry.set({
      id: entryId,
      name: entry.symptomName,
      date: fromPocketBaseDate(entry.date),
      level: entry.discomfortLevel ?? null,
    });
    this.changes.markForCheck();
  }

  /** The arrow keys choose like in a group of radio buttons */
  protected onCourseKey(event: KeyboardEvent): void {
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[
      event.key
    ];
    if (!step) return;

    event.preventDefault();
    const count = this.courses.length;
    const index = this.courses.indexOf(this.course());
    const course = this.courses[(index + step + count) % count];
    this.course.set(course);
    this.host.nativeElement
      .querySelector<HTMLElement>(`[data-course="${course}"]`)
      ?.focus();
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
    return !!this.entry() && !!this.moment() && !this.isTooEarly();
  }

  async save(): Promise<void> {
    const entry = this.entry();
    const moment = this.moment();
    if (!entry || !moment || !this.isValid() || this.isSaving()) return;

    this.isSaving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const followUp = {
        entryId: entry.id,
        date: toPocketBaseDate(moment),
        course: this.course(),
        // A symptom that is gone has no level
        discomfortLevel: this.course() === 'gone' ? null : this.discomfortLevel,
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
