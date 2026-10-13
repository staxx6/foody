import { Component, computed, effect, inject, untracked } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { DishEntry, DishEntryStore } from '../dish-entry/dish-entry-store';
import { MealRowComponent } from '../dish-entry/meal-row.component';
import {
  MedicationEntry,
  MedicationEntryStore,
} from '../medication/medication-entry-store';
import { MedicationRowComponent } from '../medication/medication-row.component';
import { fromPocketBaseDate } from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { UiStore } from '../shared/ui-store';
import {
  SymptomEntry,
  SymptomEntryStore,
} from '../symptom-entry/symptom-entry-store';
import { SymptomRowComponent } from '../symptom-entry/symptom-row.component';

type Item =
  | { kind: 'meal'; entry: DishEntry }
  | { kind: 'symptom'; entry: SymptomEntry }
  | { kind: 'medication'; entry: MedicationEntry };

/** Entries at the same time: what was eaten comes before what it caused */
const ORDER = { meal: 0, medication: 1, symptom: 2 };

/** The time of an entry to the minute, which is as exact as it is entered */
function minute(entry: { date: string }): number {
  return Math.floor(fromPocketBaseDate(entry.date).getTime() / 60_000);
}

/**
 * Everything that was logged on a day in the order it happened, to see what
 * came after what
 */
@Component({
  selector: 'app-day-timeline',
  imports: [MealRowComponent, SymptomRowComponent, MedicationRowComponent],
  template: `
    @if (error(); as message) {
      <p class="list-message error">{{ message }}</p>
    } @else if (items().length > 0) {
      <ul class="entry-list">
        @for (item of items(); track item.entry.id) {
          @switch (item.kind) {
            @case ('meal') {
              <li
                appMealRow
                [entry]="item.entry"
                [rowId]="item.entry.id"
                [showKind]="true"
                [continues]="item.continues"
              ></li>
            }
            @case ('symptom') {
              <li
                appSymptomRow
                [entry]="item.entry"
                [rowId]="item.entry.id"
                [showKind]="true"
              ></li>
            }
            @case ('medication') {
              <li
                appMedicationRow
                [entry]="item.entry"
                [rowId]="item.entry.id"
                [showKind]="true"
              ></li>
            }
          }
        }
      </ul>
    } @else if (isLoading()) {
      <p class="list-message">{{ t().loading }}</p>
    } @else {
      <p class="list-message">{{ t().noEntries }}</p>
    }
  `,
})
export class DayTimelineComponent {
  protected readonly t = inject(I18n).t;
  private readonly meals = inject(DishEntryStore);
  private readonly symptoms = inject(SymptomEntryStore);
  private readonly medications = inject(MedicationEntryStore);
  private readonly sync = inject(OfflineDataAccessService);
  private readonly uiStore = inject(UiStore);

  protected readonly error = computed(
    () =>
      this.meals.error() ?? this.symptoms.error() ?? this.medications.error(),
  );
  protected readonly isLoading = computed(
    () =>
      this.meals.isLoading() ||
      this.symptoms.isLoading() ||
      this.medications.isLoading(),
  );

  protected readonly items = computed(() => {
    const items: Item[] = [
      ...this.meals
        .entries()
        .map((entry) => ({ kind: 'meal' as const, entry })),
      ...this.symptoms
        .entries()
        .map((entry) => ({ kind: 'symptom' as const, entry })),
      ...this.medications
        .entries()
        .map((entry) => ({ kind: 'medication' as const, entry })),
    ].sort(
      (a, b) =>
        minute(a.entry) - minute(b.entry) || ORDER[a.kind] - ORDER[b.kind],
    );

    return items.map((item, index) => {
      const before = items[index - 1];
      return {
        ...item,
        // What was eaten together reads as one meal
        continues:
          item.kind === 'meal' &&
          before?.kind === 'meal' &&
          minute(before.entry) === minute(item.entry),
      };
    });
  });

  constructor() {
    // Loads initially, for another day and when the data changed
    effect(() => {
      this.sync.revision();
      const day = this.uiStore.selectedDay();
      untracked(() => {
        void this.meals.loadEntries(day);
        void this.symptoms.loadEntries(day);
        void this.medications.loadEntries(day);
      });
    });
  }
}
