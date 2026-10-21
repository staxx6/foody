import { Component, computed, inject, input } from '@angular/core';
import { elapsed, fromPocketBaseDate, isSameDay } from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { LevelChipComponent } from '../shared/level.component';
import { SymptomFollowUp } from './symptom-entry-store';

/**
 * When a follow-up was, e.g. "14:30 · after 3 h", with the day if it is
 * another one than that of the symptom entry
 * @param start the time of the symptom entry
 */
export function followUpTime(i18n: I18n, start: Date, date: Date): string {
  const { hours, minutes } = elapsed(start, date);
  const time = new Intl.DateTimeFormat(i18n.language(), {
    ...(isSameDay(start, date) ? {} : { day: 'numeric', month: 'short' }),
    hour: '2-digit',
    minute: '2-digit',
    // Like the times of the entries
    hourCycle: 'h23',
  }).format(date);
  return `${time} · ${i18n.t().afterDuration(hours, minutes)}`;
}

/**
 * One line that says how a symptom was some time after it was logged
 */
@Component({
  selector: 'app-follow-up-summary',
  imports: [LevelChipComponent],
  template: `
    <span class="when">{{ when() }}</span>
    <span class="chip" [attr.data-course]="followUp().course">
      {{ t().courses[followUp().course] }}
    </span>
    @if (followUp().discomfortLevel; as level) {
      <app-level-chip [level]="level" />
    }
    @if (followUp().comment) {
      <span class="comment">{{ followUp().comment }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        font-size: 0.85rem;
      }

      .when {
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }

      .chip[data-course] {
        background: var(--bg);
        color: var(--text);
      }

      .chip[data-course='better'],
      .chip[data-course='gone'] {
        color: var(--success);
      }

      .chip[data-course='worse'] {
        color: var(--danger);
      }

      .comment {
        flex-basis: 100%;
        color: var(--text-muted);
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class FollowUpSummaryComponent {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;

  readonly followUp = input.required<SymptomFollowUp>();
  /** The time of the symptom entry, as PocketBase stores it */
  readonly start = input.required<string>();
  /** Without the time, where it is shown next to the line, e.g. "after 3 h" */
  readonly withTime = input(true);

  protected readonly when = computed(() => {
    const start = fromPocketBaseDate(this.start());
    const date = fromPocketBaseDate(this.followUp().date);
    if (this.withTime()) return followUpTime(this.i18n, start, date);

    const { hours, minutes } = elapsed(start, date);
    return this.t().afterDuration(hours, minutes);
  });
}
