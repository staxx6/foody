import {
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { DishEntryListComponent } from '../dish-entry/dish-entry-list.component';
import { addDays, isSameDay, toDateInputValue } from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { Keyboard } from '../shared/keyboard/keyboard';
import { MedicationEntryListComponent } from '../medication/medication-entry-list.component';
import { IconComponent } from '../shared/icon.component';
import { UiStore } from '../shared/ui-store';
import { SymptomEntryListComponent } from '../symptom-entry/symptom-entry-list.component';

// A swipe has to be mostly horizontal and long enough to be meant
const SWIPE_MIN_DISTANCE = 70;
const SWIPE_MAX_DRIFT = 50;

/**
 * What was logged on a day, with navigation to the days around it
 */
@Component({
  selector: 'app-day',
  imports: [
    DishEntryListComponent,
    SymptomEntryListComponent,
    MedicationEntryListComponent,
    IconComponent,
  ],
  host: {
    '(touchstart)': 'onTouchStart($event)',
    '(touchend)': 'onTouchEnd($event)',
  },
  template: `
    <div class="day">
      <button
        type="button"
        class="nav"
        (click)="shift(-1)"
        [attr.aria-label]="t().previousDay"
      >
        <app-icon name="chevron-left" />
      </button>
      <button
        type="button"
        class="title"
        (click)="openPicker()"
        [title]="t().chooseDay"
      >
        <span class="day-label">{{ label() }}</span>
        <span class="day-date">{{ i18n.formatFullDate(day()) }}</span>
      </button>
      <!-- The date picker of the browser, opened by the title -->
      <input
        #picker
        class="picker"
        type="date"
        tabindex="-1"
        aria-hidden="true"
        [value]="dayValue()"
        (change)="pick(picker.value)"
      />
      <button
        type="button"
        class="nav"
        (click)="shift(1)"
        [attr.aria-label]="t().nextDay"
      >
        <app-icon name="chevron-right" />
      </button>
    </div>

    @if (!isToday()) {
      <button type="button" class="back-to-today" (click)="uiStore.goHome()">
        <app-icon name="today" /> {{ t().backToToday }}
      </button>
    }

    <section>
      <h2>
        <app-icon name="meal" /> {{ t().meals }}
        <button
          type="button"
          class="add"
          (click)="uiStore.showForm('new-meal')"
          [title]="t().logMeal"
          [attr.aria-label]="t().logMeal"
        >
          <app-icon name="plus" /><kbd class="kbd">M</kbd>
        </button>
      </h2>
      <app-dish-entry-list class="card" />
    </section>

    <section>
      <h2>
        <app-icon name="symptom" /> {{ t().health }}
        <button
          type="button"
          class="add"
          (click)="uiStore.showForm('new-health-entry')"
          [title]="t().logSymptom"
          [attr.aria-label]="t().logSymptom"
        >
          <app-icon name="plus" /><kbd class="kbd">S</kbd>
        </button>
      </h2>
      <app-symptom-entry-list class="card" />
    </section>

    <section>
      <h2>
        <app-icon name="pill" /> {{ t().medications }}
        <button
          type="button"
          class="add"
          (click)="uiStore.showForm('new-medication-entry')"
          [title]="t().logMedication"
          [attr.aria-label]="t().logMedication"
        >
          <app-icon name="plus" /><kbd class="kbd">P</kbd>
        </button>
      </h2>
      <app-medication-entry-list class="card" />
    </section>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 24px;
        /* Vertical scrolling stays with the browser, swipes come to us */
        touch-action: pan-y;
      }

      .day {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Not visible, but in place so the picker opens below the title */
      .picker {
        position: absolute;
        left: 50%;
        bottom: 0;
        width: 1px;
        height: 1px;
        padding: 0;
        border: none;
        opacity: 0;
        pointer-events: none;
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

      .title {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0;
        border: none;
        background: none;
        color: var(--text);
        cursor: pointer;
      }

      .day-label {
        font-size: 1.5rem;
        font-weight: 700;
      }

      .day-date {
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      .back-to-today {
        align-self: center;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: -12px;
        padding: 6px 14px;
        border: none;
        border-radius: 999px;
        background: var(--primary-soft);
        color: var(--primary);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }

      h2 {
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
        display: block;
        overflow: hidden;
      }

      /* Adds an entry to the list; small screens have the menu for it */
      .add {
        display: none;
      }

      /* Wide screens: meals, symptoms and medications side by side */
      @media (min-width: 1024px) {
        .add {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: -4px 0 -4px auto;
          padding: 3px 6px 3px 8px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface);
          color: var(--text-muted);
          font-size: 0.85rem;
          cursor: pointer;
        }

        .add:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        :host {
          display: grid;
          /* As many columns as fit without squeezing the entries */
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          align-items: start;
          gap: 28px 24px;
        }

        .day,
        .back-to-today {
          grid-column: 1 / -1;
        }

        .day {
          justify-content: flex-start;
        }

        .title {
          flex: none;
          order: -1;
          align-items: flex-start;
          margin-right: 16px;
        }

        .day-label {
          font-size: 2rem;
        }

        .back-to-today {
          justify-self: start;
          margin-top: -16px;
        }
      }
    `,
  ],
})
export class DayComponent {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly uiStore = inject(UiStore);

  protected readonly day = this.uiStore.selectedDay;
  protected readonly isToday = computed(() =>
    isSameDay(this.day(), new Date()),
  );

  /** "Today", "Yesterday", "Tomorrow" or the weekday */
  protected readonly label = computed(() => {
    const today = new Date();
    const day = this.day();
    if (isSameDay(day, today)) return this.t().today;
    if (isSameDay(day, addDays(today, -1))) return this.t().yesterday;
    if (isSameDay(day, addDays(today, 1))) return this.t().tomorrow;
    return this.i18n.formatWeekday(day);
  });

  protected readonly dayValue = computed(() => toDateInputValue(this.day()));
  private readonly picker =
    viewChild.required<ElementRef<HTMLInputElement>>('picker');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    inject(Keyboard).bind({
      ArrowLeft: () => this.shift(-1),
      ArrowRight: () => this.shift(1),
      t: () => this.uiStore.goHome(),
      f: () => this.followUp(),
    });
  }

  /**
   * Adds a follow-up to the selected symptom entry. Without one, the
   * selection moves to the symptoms, so one can be chosen.
   */
  private followUp(): boolean {
    const entry = 'app-symptom-entry-list li.entry';
    const selected = document.activeElement?.closest<HTMLElement>(entry);
    const id = selected?.dataset['entryId'];
    if (id) {
      this.uiStore.edit('new-follow-up', id);
      return true;
    }
    const first = this.host.nativeElement.querySelector<HTMLElement>(entry);
    first?.focus();
    return !!first;
  }

  protected openPicker(): void {
    const picker = this.picker().nativeElement;
    try {
      picker.showPicker();
    } catch {
      // Browsers without showPicker open it when the field is used
      picker.focus();
      picker.click();
    }
  }

  protected pick(value: string): void {
    // Clearing the field in the picker keeps the day
    if (value) this.day.set(new Date(`${value}T00:00`));
  }

  private touchStart: { x: number; y: number } | null = null;

  protected shift(days: number): void {
    this.day.update((day) => addDays(day, days));
  }

  protected onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStart =
      event.touches.length === 1
        ? { x: touch.clientX, y: touch.clientY }
        : null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const start = this.touchStart;
    const touch = event.changedTouches[0];
    this.touchStart = null;
    if (!start || !touch) return;

    const distance = touch.clientX - start.x;
    const drift = Math.abs(touch.clientY - start.y);
    if (Math.abs(distance) < SWIPE_MIN_DISTANCE || drift > SWIPE_MAX_DRIFT) {
      return;
    }
    // Swiping to the left moves on to the next day, like turning a page
    this.shift(distance < 0 ? 1 : -1);
  }
}
