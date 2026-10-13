import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import {
  addMonths,
  dayKey,
  isSameDay,
  startOfMonth,
} from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { Keyboard } from '../shared/keyboard/keyboard';
import { SearchSelectComponent } from '../shared/search/search-select.component';
import { UiStore } from '../shared/ui-store';
import { SymptomStore } from '../symptom-entry/symptom-store';
import { discomfortStep, levelOrDefault, MonthStore } from './month-store';

/** Levels are stored as 1-100 and shown in steps of ten, also added up */
const steps = (discomfort: number) => Math.round(discomfort / 10);

type DayCell = {
  date: Date;
  meals: number;
  medications: number;
  complaints: number;
  /** The discomfort levels of the day added up */
  discomfort: number;
  /** The names of the symptoms of the day */
  symptoms: string[];
  /** 0: no complaints, 1-4: step of the scale */
  step: number;
  isToday: boolean;
  isSelected: boolean;
  description: string;
};

/**
 * Calendar of a month that shows how the days went: how much discomfort
 * there was, optionally for a single symptom, and whether meals were logged
 */
@Component({
  selector: 'app-month',
  imports: [IconComponent, SearchSelectComponent],
  host: { '(keydown)': 'onGridKey($event)' },
  template: `
    <div class="month">
      <button
        type="button"
        class="nav"
        (click)="shift(-1)"
        [attr.aria-label]="t().previousMonth"
      >
        <app-icon name="chevron-left" />
      </button>
      <h2>
        <button
          type="button"
          class="title"
          (click)="togglePicker()"
          [attr.aria-expanded]="isPickerOpen()"
          [title]="t().chooseMonth"
        >
          {{ i18n.formatMonth(month()) }}
          <app-icon name="chevron-down" />
        </button>
      </h2>
      <button
        type="button"
        class="nav"
        (click)="shift(1)"
        [attr.aria-label]="t().nextMonth"
      >
        <app-icon name="chevron-right" />
      </button>
    </div>

    @if (isPickerOpen()) {
      <div class="card picker">
        <div class="year">
          <button
            type="button"
            class="nav"
            (click)="pickerYear.set(pickerYear() - 1)"
            [attr.aria-label]="t().previousYear"
          >
            <app-icon name="chevron-left" />
          </button>
          <span>{{ pickerYear() }}</span>
          <button
            type="button"
            class="nav"
            (click)="pickerYear.set(pickerYear() + 1)"
            [attr.aria-label]="t().nextYear"
          >
            <app-icon name="chevron-right" />
          </button>
        </div>
        <div class="months">
          @for (name of monthNames(); track $index) {
            <button
              type="button"
              [class.selected]="isShown(pickerYear(), $index)"
              [class.current]="isCurrent(pickerYear(), $index)"
              (click)="pick(pickerYear(), $index)"
            >
              {{ name }}
            </button>
          }
        </div>
      </div>
    }

    @if (!isCurrentMonth()) {
      <button type="button" class="back-to-current" (click)="showCurrent()">
        <app-icon name="today" /> {{ t().backToCurrentMonth }}
      </button>
    }

    <app-search-select
      class="filter"
      [options]="symptomStore.symptoms()"
      [(value)]="symptomId"
      [placeholder]="t().allSymptoms"
      [ariaLabel]="t().filterBySymptom"
    />

    <section class="card calendar">
      <div class="grid weekdays" aria-hidden="true">
        @for (weekday of weekdays(); track weekday) {
          <span>{{ weekday }}</span>
        }
      </div>
      <div class="grid">
        @for (cell of cells(); track $index) {
          @if (cell) {
            <button
              type="button"
              class="cell"
              [attr.data-day]="cell.date.getDate()"
              [class.today]="cell.isToday"
              [class.selected]="cell.isSelected"
              (click)="uiStore.showDay(cell.date)"
              [title]="cell.description"
              [attr.aria-label]="cell.description"
            >
              <span class="number">{{ cell.date.getDate() }}</span>
              <span class="mark" [attr.data-step]="cell.step || null">
                @if (cell.step === 0 && cell.meals > 0) {
                  <app-icon class="good" name="check" />
                }
              </span>
              <span class="marks">
                <span class="meals" [class.logged]="cell.meals > 0"></span>
                @if (cell.medications > 0) {
                  <span class="medication"></span>
                }
              </span>
              <!-- Wide screens have room for the names and the numbers -->
              <span class="names">{{ cell.symptoms.join(', ') }}</span>
              <span class="facts">
                @if (cell.meals > 0) {
                  <span><app-icon name="meal" /> {{ cell.meals }}</span>
                }
                @if (cell.medications > 0) {
                  <span><app-icon name="pill" /> {{ cell.medications }}</span>
                }
              </span>
            </button>
          } @else {
            <span></span>
          }
        }
      </div>

      <div class="legend">
        <span class="scale" [title]="t().discomfortHint">
          {{ t().discomfort }}: {{ t().less }}
          @for (step of [1, 2, 3, 4]; track step) {
            <span class="mark" [attr.data-step]="step"></span>
          }
          {{ t().more }}
        </span>
        <span
          ><app-icon class="good" name="check" /> {{ t().noComplaints }}</span
        >
        <span><span class="meals logged"></span> {{ t().mealsLogged }}</span>
        <span>
          <span class="medication"></span> {{ t().medicationTaken }}
        </span>
      </div>
    </section>

    <section>
      <h3>{{ t().symptomsThisMonth }}</h3>
      <div class="card">
        @for (symptom of symptomTotals(); track symptom.id) {
          <button
            type="button"
            class="symptom"
            [class.active]="symptom.id === symptomId()"
            [attr.aria-pressed]="symptom.id === symptomId()"
            (click)="toggleFilter(symptom.id)"
          >
            <span class="name">{{ symptom.name }}</span>
            <span class="count">{{ t().entriesCount(symptom.count) }}</span>
            <span class="total" [title]="t().discomfortHint">
              {{ t().discomfortSum(steps(symptom.discomfort)) }}
            </span>
            <span class="bar">
              <span [style.width.%]="symptom.share"></span>
            </span>
          </button>
        } @empty {
          <p class="list-message">{{ t().noSymptomsThisMonth }}</p>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;

        /* The scale of the discomfort, see the global styles */
        --step-1: var(--discomfort-1);
        --step-2: var(--discomfort-2);
        --step-3: var(--discomfort-3);
        --step-4: var(--discomfort);
      }

      .month {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      h2 {
        flex: 1;
        margin: 0;
        text-align: center;
      }

      .title {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        border: none;
        background: none;
        color: var(--text);
        font: inherit;
        font-size: 1.5rem;
        font-weight: 700;
        cursor: pointer;
      }

      .title app-icon {
        font-size: 1rem;
        color: var(--text-muted);
      }

      .picker {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
      }

      .year {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 1.1rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .months {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }

      .months button {
        min-height: 44px;
        border: 2px solid transparent;
        border-radius: 10px;
        background: var(--bg);
        color: var(--text);
        font-size: 0.9rem;
        cursor: pointer;
      }

      .months button.current {
        border-color: var(--primary);
      }

      .months button.selected {
        background: var(--primary);
        color: var(--on-primary);
        font-weight: 600;
      }

      .back-to-current {
        align-self: center;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border: none;
        border-radius: 999px;
        background: var(--primary-soft);
        color: var(--primary);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }

      .nav {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 50%;
        background: var(--surface);
        color: var(--text);
        font-size: 1.1rem;
        cursor: pointer;
      }

      /* The search select takes its field styles from forms */
      .filter ::ng-deep input {
        width: 100%;
        min-height: 44px;
        padding: 10px 40px 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        font-size: 1rem;
        outline: none;
      }

      .calendar {
        padding: 12px 8px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }

      .weekdays span {
        padding-bottom: 6px;
        text-align: center;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-muted);
      }

      .cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 6px 0 5px;
        border: 2px solid transparent;
        border-radius: 10px;
        background: none;
        color: var(--text);
        cursor: pointer;
      }

      .cell:hover {
        background: var(--bg);
      }

      .cell.selected {
        background: var(--primary-soft);
      }

      .cell.today {
        border-color: var(--primary);
      }

      .number {
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
      }

      .mark {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 6px;
      }

      .mark[data-step='1'] {
        background: var(--step-1);
      }

      .mark[data-step='2'] {
        background: var(--step-2);
      }

      .mark[data-step='3'] {
        background: var(--step-3);
      }

      .mark[data-step='4'] {
        background: var(--step-4);
      }

      .good {
        color: var(--success);
        font-size: 0.85rem;
      }

      .marks {
        display: flex;
        align-items: center;
        gap: 3px;
        height: 4px;
      }

      /* Shaped like a pill, to tell it from the dot of the meals */
      .medication {
        width: 9px;
        height: 4px;
        border-radius: 2px;
        background: var(--primary);
      }

      .meals {
        width: 4px;
        height: 4px;
        border-radius: 50%;
      }

      .meals.logged {
        background: var(--text-muted);
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 16px;
        margin-top: 12px;
        padding: 10px 8px 0;
        border-top: 1px solid var(--border);
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      .legend > span {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .legend .mark {
        width: 14px;
        height: 14px;
        border-radius: 4px;
      }

      h3 {
        margin: 8px 0 8px 4px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .symptom {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 4px 12px;
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: none;
        color: var(--text);
        font-size: 0.95rem;
        text-align: left;
        cursor: pointer;
      }

      .symptom + .symptom {
        border-top: 1px solid var(--border);
      }

      .symptom.active {
        background: var(--primary-soft);
      }

      .symptom .name {
        font-weight: 500;
        overflow-wrap: anywhere;
      }

      .symptom .count,
      .symptom .total {
        font-size: 0.85rem;
        font-variant-numeric: tabular-nums;
        color: var(--text-muted);
      }

      .symptom .total {
        text-align: right;
        font-weight: 600;
        color: var(--text);
      }

      .bar {
        grid-column: 1 / -1;
        height: 6px;
        border-radius: 3px;
        background: var(--bg);
      }

      .bar span {
        display: block;
        height: 100%;
        min-width: 4px;
        border-radius: 3px;
        background: var(--step-3);
      }

      .names,
      .facts {
        display: none;
      }

      /* Wide screens: a large calendar with the filter and the symptoms next
         to it */
      @media (min-width: 1024px) {
        :host {
          display: grid;
          grid-template-columns: minmax(0, 1fr) clamp(260px, 26vw, 340px);
          grid-template-rows: auto auto auto auto 1fr;
          grid-template-areas:
            'head head'
            'picker picker'
            'back back'
            'calendar filter'
            'calendar totals';
          gap: 0 28px;
        }

        .month {
          grid-area: head;
          justify-content: flex-start;
          margin-bottom: 20px;
        }

        h2 {
          flex: none;
          order: -1;
          margin-right: 16px;
          text-align: left;
        }

        .title {
          font-size: 2rem;
        }

        .picker {
          grid-area: picker;
          max-width: 420px;
          margin-bottom: 20px;
        }

        .back-to-current {
          grid-area: back;
          justify-self: start;
          margin-bottom: 20px;
        }

        .filter {
          grid-area: filter;
          margin-bottom: 20px;
        }

        .calendar {
          grid-area: calendar;
          padding: 20px;
        }

        :host > section:last-of-type {
          grid-area: totals;
        }

        :host > section:last-of-type h3 {
          margin-top: 0;
        }

        .grid {
          gap: 6px;
        }

        .cell {
          align-items: stretch;
          gap: 8px;
          min-height: 104px;
          padding: 8px 10px;
          background: var(--bg);
          text-align: left;
        }

        .cell:hover {
          background: var(--border);
        }

        .number {
          font-size: 0.95rem;
          font-weight: 600;
        }

        /* The discomfort as a bar across the day */
        .mark[data-step] {
          width: 100%;
          height: 12px;
        }

        .mark:not([data-step]) {
          width: auto;
          height: 12px;
          justify-content: flex-start;
        }

        .marks {
          display: none;
        }

        /* What the day was about, as far as there is room */
        .names {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          font-size: 0.75rem;
          line-height: 1.25;
          text-align: left;
          /* Long names are split where a word may be, not anywhere */
          hyphens: auto;
          overflow-wrap: break-word;
        }

        .facts {
          display: flex;
          flex-wrap: wrap;
          gap: 2px 10px;
          margin-top: auto;
          font-size: 0.8rem;
          font-variant-numeric: tabular-nums;
          color: var(--text-muted);
        }

        .facts span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .legend .mark[data-step] {
          width: 14px;
          height: 14px;
        }
      }
    `,
  ],
})
export class MonthComponent implements OnInit {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly uiStore = inject(UiStore);
  protected readonly symptomStore = inject(SymptomStore);
  private readonly monthStore = inject(MonthStore);
  private readonly sync = inject(OfflineDataAccessService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The first day of the shown month; starts with the month of the day view */
  protected readonly month = signal(startOfMonth(this.uiStore.selectedDay()));
  /** Only this symptom is shown; empty for all */
  protected readonly symptomId = signal('');

  protected readonly weekdays = computed(() => this.i18n.weekdayNames());
  protected readonly monthNames = computed(() => this.i18n.monthNames());
  protected readonly steps = steps;

  /** The panel to jump to any month */
  protected readonly isPickerOpen = signal(false);
  protected readonly pickerYear = signal(this.month().getFullYear());
  protected readonly isCurrentMonth = computed(() =>
    this.isShownMonth(new Date()),
  );

  private readonly entries = computed(() => {
    const symptomId = this.symptomId();
    return this.monthStore
      .symptomEntries()
      .filter((entry) => !symptomId || entry.symptomId === symptomId);
  });

  /** The days of the month, after empty places up to its first weekday */
  protected readonly cells = computed<(DayCell | null)[]>(() => {
    const month = this.month();
    const today = new Date();
    const selected = this.uiStore.selectedDay();
    const t = this.t();

    const complaints = new Map<string, { count: number; discomfort: number }>();
    for (const entry of this.entries()) {
      const key = dayKey(entry.date);
      const day = complaints.get(key) ?? { count: 0, discomfort: 0 };
      complaints.set(key, {
        count: day.count + 1,
        discomfort: day.discomfort + levelOrDefault(entry.level),
      });
    }
    // The names of the symptoms of a day, each once
    const names = new Map<string, Set<string>>();
    for (const entry of this.entries()) {
      const key = dayKey(entry.date);
      names.set(key, (names.get(key) ?? new Set()).add(entry.symptomName));
    }
    const meals = new Map<string, number>();
    for (const date of this.monthStore.meals()) {
      meals.set(dayKey(date), (meals.get(dayKey(date)) ?? 0) + 1);
    }
    const medications = new Map<string, number>();
    for (const date of this.monthStore.medications()) {
      medications.set(dayKey(date), (medications.get(dayKey(date)) ?? 0) + 1);
    }

    // Weeks start on Monday
    const leading = (month.getDay() + 6) % 7;
    const days = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    const cells: (DayCell | null)[] = new Array(leading).fill(null);

    for (let day = 1; day <= days; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      const key = dayKey(date);
      const { count, discomfort } = complaints.get(key) ?? {
        count: 0,
        discomfort: 0,
      };
      const mealCount = meals.get(key) ?? 0;
      const medicationCount = medications.get(key) ?? 0;
      const step = discomfortStep(count, discomfort);

      const facts = [
        ...(count > 0 ? [t.dayComplaints(count, steps(discomfort))] : []),
        ...(mealCount > 0 ? [t.dayMeals(mealCount)] : []),
        ...(medicationCount > 0 ? [t.dayMedications(medicationCount)] : []),
      ];
      cells.push({
        date,
        meals: mealCount,
        medications: medicationCount,
        complaints: count,
        discomfort,
        symptoms: [...(names.get(key) ?? [])],
        step,
        isToday: isSameDay(date, today),
        isSelected: isSameDay(date, selected),
        description: `${this.i18n.formatFullDate(date)}: ${facts.join(', ') || t.noEntries}`,
      });
    }
    return cells;
  });

  /** All symptoms of the month, independent of the filter, worst first */
  protected readonly symptomTotals = computed(() => {
    const totals = new Map<
      string,
      { id: string; name: string; count: number; discomfort: number }
    >();
    for (const entry of this.monthStore.symptomEntries()) {
      const total = totals.get(entry.symptomId) ?? {
        id: entry.symptomId,
        name: entry.symptomName,
        count: 0,
        discomfort: 0,
      };
      totals.set(entry.symptomId, {
        ...total,
        count: total.count + 1,
        discomfort: total.discomfort + levelOrDefault(entry.level),
      });
    }

    const sorted = [...totals.values()].sort(
      (a, b) => b.discomfort - a.discomfort || a.name.localeCompare(b.name),
    );
    const highest = sorted[0]?.discomfort ?? 0;
    return sorted.map((total) => ({
      ...total,
      share: highest > 0 ? (total.discomfort / highest) * 100 : 0,
    }));
  });

  constructor() {
    inject(Keyboard).bind({
      ArrowLeft: () => this.shift(-1),
      ArrowRight: () => this.shift(1),
      t: () => this.showCurrent(),
      // Into the calendar, where the arrow keys move from day to day
      ArrowDown: () => this.focusDay(this.startDay()),
      ArrowUp: () => this.focusDay(this.startDay()),
    });

    // Loads the month initially, when it changes and after a synchronization
    effect(() => {
      const month = this.month();
      this.sync.revision();
      untracked(() => void this.monthStore.load(month));
    });
  }

  ngOnInit(): void {
    this.symptomStore.loadSymptoms();
  }

  protected togglePicker(): void {
    this.pickerYear.set(this.month().getFullYear());
    this.isPickerOpen.update((isOpen) => !isOpen);
  }

  protected pick(year: number, month: number): void {
    this.month.set(new Date(year, month, 1));
    this.isPickerOpen.set(false);
  }

  protected showCurrent(): void {
    this.month.set(startOfMonth(new Date()));
    this.isPickerOpen.set(false);
  }

  protected isShown(year: number, month: number): boolean {
    return this.isShownMonth(new Date(year, month, 1));
  }

  protected isCurrent(year: number, month: number): boolean {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month;
  }

  private isShownMonth(date: Date): boolean {
    return (
      date.getFullYear() === this.month().getFullYear() &&
      date.getMonth() === this.month().getMonth()
    );
  }

  protected shift(months: number): void {
    this.month.update((month) => addMonths(month, months));
  }

  /** In the calendar the arrow keys move by a day or a week */
  protected onGridKey(event: KeyboardEvent): void {
    const days = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
      event.key
    ];
    const day = Number(
      (event.target as HTMLElement).closest<HTMLElement>('[data-day]')?.dataset[
        'day'
      ],
    );
    if (!days || !day || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    event.preventDefault();
    const month = this.month();
    // Beyond the month, it leads into the next or previous one
    this.focusDay(new Date(month.getFullYear(), month.getMonth(), day + days));
  }

  /** Where the keyboard enters the calendar */
  private startDay(): Date {
    const selected = this.uiStore.selectedDay();
    const today = new Date();
    if (this.isShownMonth(selected)) return selected;
    return this.isShownMonth(today) ? today : this.month();
  }

  private focusDay(date: Date): void {
    if (!this.isShownMonth(date)) this.month.set(startOfMonth(date));
    // After the month has been rendered
    setTimeout(() =>
      this.host.nativeElement
        .querySelector<HTMLElement>(`[data-day="${date.getDate()}"]`)
        ?.focus(),
    );
  }

  protected toggleFilter(symptomId: string): void {
    this.symptomId.update((current) =>
      current === symptomId ? '' : symptomId,
    );
  }
}
