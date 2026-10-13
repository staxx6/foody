import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  DATA_ACCESS,
  OfflineDataAccessService,
} from '@foody/pocketbase-access';
import { discomfortStep, levelOrDefault } from '../month/month-store';
import {
  addDays,
  dayKey,
  fromPocketBaseDate,
  isSameDay,
} from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { UiStore } from '../shared/ui-store';

type Day = {
  date: Date;
  weekday: string;
  /** 0: no complaints, 1-4: step of the scale of the month view */
  step: number;
  meals: number;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
};

type WeekData = {
  /** The discomfort levels of the symptom entries of each day */
  levels: Map<string, (number | null)[]>;
  meals: Map<string, number>;
};

/**
 * The week of the day that is shown: how each day went, and a way to it.
 * Only on wide screens, where there is room next to the day itself.
 */
@Component({
  selector: 'app-week-strip',
  imports: [IconComponent],
  template: `
    @for (day of days(); track day.date.getTime()) {
      <button
        type="button"
        [class.selected]="day.isSelected"
        [class.today]="day.isToday"
        [class.future]="day.isFuture"
        [attr.aria-current]="day.isSelected ? 'date' : null"
        [title]="i18n.formatFullDate(day.date)"
        (click)="uiStore.showDay(day.date, true)"
      >
        <span class="weekday">{{ day.weekday }}</span>
        <span class="number">{{ day.date.getDate() }}</span>
        <span class="mark" [attr.data-step]="day.step || null">
          @if (day.step === 0 && day.meals > 0) {
            <app-icon name="check" />
          }
        </span>
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: none;
      }

      @media (min-width: 1024px) {
        :host {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          max-width: 560px;
        }
      }

      button {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 4px;
        border: 2px solid transparent;
        border-radius: 12px;
        background: var(--surface);
        color: var(--text);
        cursor: pointer;
      }

      button:hover {
        border-color: var(--border);
      }

      button.today .number {
        color: var(--primary);
      }

      button.selected {
        border-color: var(--primary);
        background: var(--primary-soft);
      }

      button.future {
        background: none;
        color: var(--text-muted);
      }

      .weekday {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-muted);
      }

      .number {
        font-size: 0.95rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      /* The scale of the month view */
      .mark {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 8px;
        border-radius: 4px;
        color: var(--success);
        font-size: 0.7rem;
      }

      .mark[data-step='1'] {
        background: var(--discomfort-1);
      }

      .mark[data-step='2'] {
        background: var(--discomfort-2);
      }

      .mark[data-step='3'] {
        background: var(--discomfort-3);
      }

      .mark[data-step='4'] {
        background: var(--discomfort);
      }
    `,
  ],
})
export class WeekStripComponent {
  protected readonly i18n = inject(I18n);
  protected readonly uiStore = inject(UiStore);
  private readonly dataAccess = inject(DATA_ACCESS);
  private readonly sync = inject(OfflineDataAccessService);

  /** The Monday of the week of the day that is shown */
  private readonly monday = computed(
    () => {
      const day = this.uiStore.selectedDay();
      return addDays(day, -((day.getDay() + 6) % 7));
    },
    { equal: isSameDay },
  );
  private readonly data = signal<WeekData>({
    levels: new Map(),
    meals: new Map(),
  });

  protected readonly days = computed<Day[]>(() => {
    const { levels, meals } = this.data();
    const today = new Date();
    const selected = this.uiStore.selectedDay();
    const weekdays = this.i18n.weekdayNames();

    return weekdays.map((weekday, index) => {
      const date = addDays(this.monday(), index);
      const ofDay = levels.get(dayKey(date)) ?? [];
      const discomfort = ofDay.reduce(
        (sum: number, level) => sum + levelOrDefault(level),
        0,
      );
      return {
        date,
        weekday,
        step: discomfortStep(ofDay.length, discomfort),
        meals: meals.get(dayKey(date)) ?? 0,
        isToday: isSameDay(date, today),
        isSelected: isSameDay(date, selected),
        isFuture: date.getTime() > today.getTime(),
      };
    });
  });

  constructor() {
    // Loads initially, for another week and when the data changed
    effect(() => {
      const monday = this.monday();
      this.sync.revision();
      untracked(() => void this.load(monday));
    });
  }

  private async load(monday: Date): Promise<void> {
    const dateRange = { field: 'date', from: monday, to: addDays(monday, 7) };
    const time = (record: { created: string; [key: string]: unknown }) =>
      fromPocketBaseDate(String(record['date'] ?? record.created));

    const [symptoms, meals] = await Promise.all([
      this.dataAccess.list({
        collectionName: 'symptomEntries',
        options: { dateRange },
        map: (record) => ({
          day: dayKey(time(record)),
          // PocketBase stores "no value" of a number as 0
          level: Number(record['discomfortLevel']) || null,
        }),
      }),
      this.dataAccess.list({
        collectionName: 'dishEntries',
        options: { dateRange },
        map: (record) => dayKey(time(record)),
      }),
    ]);
    // Another week may have been chosen in the meantime
    if (!isSameDay(monday, this.monday())) return;

    const levels = new Map<string, (number | null)[]>();
    for (const { day, level } of symptoms) {
      levels.set(day, [...(levels.get(day) ?? []), level]);
    }
    const mealCounts = new Map<string, number>();
    for (const day of meals) {
      mealCounts.set(day, (mealCounts.get(day) ?? 0) + 1);
    }
    this.data.set({ levels, meals: mealCounts });
  }
}
