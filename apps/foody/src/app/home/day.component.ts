import { NgTemplateOutlet } from '@angular/common';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  untracked,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { MealSelection } from '../dish-entry/meal-selection';
import { MealSelectionBarComponent } from '../dish-entry/meal-selection-bar.component';
import { DishEntryListComponent } from '../dish-entry/dish-entry-list.component';
import { addDays, isSameDay, toDateInputValue } from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { Keyboard } from '../shared/keyboard/keyboard';
import { MedicationEntryListComponent } from '../medication/medication-entry-list.component';
import { NoteRowComponent } from '../note/note-row.component';
import { NoteStore } from '../note/note-store';
import { IconComponent, IconName } from '../shared/icon.component';
import { DayView, SettingsStore } from '../shared/settings-store';
import { DaySummaryComponent } from './day-summary.component';
import { DayTimelineComponent } from './day-timeline.component';
import { WeekStripComponent } from './week-strip.component';
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
    DayTimelineComponent,
    WeekStripComponent,
    DaySummaryComponent,
    MealSelectionBarComponent,
    NoteRowComponent,
    IconComponent,
    NgTemplateOutlet,
  ],
  host: {
    '[class.timeline-view]': "settings.dayView() === 'timeline'",
    '(touchstart)': 'onTouchStart($event)',
    '(touchend)': 'onTouchEnd($event)',
  },
  template: `
    <app-meal-selection-bar />

    <!-- One line on wide screens; on small ones its parts are lines of the page -->
    <div class="head">
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

      <app-week-strip />
      <ng-container [ngTemplateOutlet]="viewSwitch" />
    </div>

    <!-- Wide screens have it next to the day, small ones in the first heading -->
    <ng-template #viewSwitch>
      <div class="views" role="group" [attr.aria-label]="t().dayView">
        @for (view of views; track view.value) {
          <button
            type="button"
            [class.active]="settings.dayView() === view.value"
            [attr.aria-pressed]="settings.dayView() === view.value"
            [title]="t()[view.value]"
            [attr.aria-label]="t()[view.value]"
            (click)="settings.dayView.set(view.value)"
          >
            <app-icon [name]="view.icon" />
          </button>
        }
      </div>
    </ng-template>

    <!-- About the day as a whole, so above its entries; only if there are any -->
    @if (notes.notes().length > 0) {
      <section class="notes">
        <h2>
          <app-icon name="note" /> {{ t().notes }}
          <button
            type="button"
            class="add"
            (click)="uiStore.showForm('new-note')"
            [title]="t().writeNote"
            [attr.aria-label]="t().writeNote"
          >
            <app-icon name="plus" /><kbd class="kbd">W</kbd>
          </button>
        </h2>
        <ul class="card entry-list">
          @for (note of notes.notes(); track note.id) {
            <li appNoteRow [note]="note" [rowId]="note.id"></li>
          }
        </ul>
      </section>
    }

    @if (settings.dayView() === 'timeline') {
      <section class="timeline">
        <h2>
          <app-icon name="list" /> {{ t().entries }}
          <span class="adds">
            <button
              type="button"
              class="add"
              (click)="uiStore.showForm('new-meal')"
              [title]="t().logMeal"
              [attr.aria-label]="t().logMeal"
            >
              <app-icon name="meal" /><kbd class="kbd">M</kbd>
            </button>
            <button
              type="button"
              class="add"
              (click)="uiStore.showForm('new-health-entry')"
              [title]="t().logSymptom"
              [attr.aria-label]="t().logSymptom"
            >
              <app-icon name="symptom" /><kbd class="kbd">S</kbd>
            </button>
            <button
              type="button"
              class="add"
              (click)="uiStore.showForm('new-medication-entry')"
              [title]="t().logMedication"
              [attr.aria-label]="t().logMedication"
            >
              <app-icon name="pill" /><kbd class="kbd">P</kbd>
            </button>
            <button
              type="button"
              class="add"
              (click)="uiStore.showForm('new-note')"
              [title]="t().writeNote"
              [attr.aria-label]="t().writeNote"
            >
              <app-icon name="note" /><kbd class="kbd">W</kbd>
            </button>
          </span>
          <ng-container [ngTemplateOutlet]="viewSwitch" />
        </h2>
        <app-day-timeline class="card" />
      </section>
      <app-day-summary />
    } @else {
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
          <ng-container [ngTemplateOutlet]="viewSwitch" />
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
    }
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

      /* Its parts are lines of the page */
      .head {
        display: contents;
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
      .add,
      .adds,
      .head > .views,
      app-day-summary {
        display: none;
      }

      /* The switch between the views, at the end of the line */
      .views {
        display: flex;
        gap: 2px;
        margin: -6px 0 -6px auto;
        padding: 3px;
        border-radius: 10px;
        background: var(--field);
      }

      .views button {
        display: flex;
        padding: 6px 10px;
        border: none;
        border-radius: 8px;
        background: none;
        color: var(--text-muted);
        cursor: pointer;
      }

      .views button.active {
        background: var(--surface);
        color: var(--primary);
        box-shadow: var(--shadow);
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

        /* The day, the days around it and the switch of the view in a line */
        .head {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px 20px;
        }

        /* A line of its own, as long as there is no room in the first one */
        app-week-strip {
          order: 1;
          flex: 1 1 100%;
          max-width: 460px;
        }

        .head > .views {
          display: flex;
          margin: 0 0 0 auto;
        }

        .timeline,
        .notes {
          grid-column: 1 / -1;
        }

        .adds {
          display: flex;
          gap: 6px;
          margin-left: auto;
        }

        .adds .add {
          margin-left: 0;
        }

        h2 .views {
          display: none;
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
          margin-top: 0;
        }
      }

      /* Room for a column next to the timeline that sums up the day */
      @media (min-width: 1280px) {
        :host(.timeline-view) {
          grid-template-columns: minmax(0, 1fr) 340px;
        }

        app-week-strip {
          order: 0;
          flex: 1 1 320px;
          margin-left: auto;
        }

        .head > .views {
          margin: 0;
        }

        .timeline,
        .notes {
          grid-column: 1;
        }

        /* Next to the notes as well, which are above the timeline */
        app-day-summary {
          grid-column: 2;
          grid-row: 2 / span 2;
          display: flex;
          position: sticky;
          top: 40px;
        }
      }
    `,
  ],
})
export class DayComponent {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly uiStore = inject(UiStore);
  protected readonly settings = inject(SettingsStore);
  protected readonly notes = inject(NoteStore);
  protected readonly views: { value: DayView; icon: IconName }[] = [
    { value: 'timeline', icon: 'list' },
    { value: 'separate', icon: 'columns' },
  ];

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
    // A selection belongs to the day it was made on
    const selection = inject(MealSelection);
    effect(() => {
      this.day();
      untracked(() => selection.clear());
    });
    inject(DestroyRef).onDestroy(() => selection.clear());

    // Loads initially, for another day and when the data changed
    const sync = inject(OfflineDataAccessService);
    effect(() => {
      sync.revision();
      const day = this.day();
      untracked(() => void this.notes.loadNotes(day));
    });

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
    const entry = 'li[data-kind="symptom"]';
    const selected = document.activeElement?.closest<HTMLElement>(entry);
    const id = selected?.dataset['rowId'];
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
    if (value) this.uiStore.showDay(new Date(`${value}T00:00`), true);
  }

  private touchStart: { x: number; y: number } | null = null;

  protected shift(days: number): void {
    // Paging through the days is not a way one wants to go back step by step
    this.uiStore.showDay(addDays(this.day(), days), true);
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
