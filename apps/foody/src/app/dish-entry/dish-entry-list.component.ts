import { Component, effect, inject, untracked } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { I18n } from '../shared/i18n/i18n';
import { UiStore } from '../shared/ui-store';
import { DishEntryStore } from './dish-entry-store';
import { MealRowComponent } from './meal-row.component';

@Component({
  selector: 'app-dish-entry-list',
  imports: [MealRowComponent],
  template: `
    @if (store.error()) {
      <p class="list-message error">{{ store.error() }}</p>
    } @else if (store.entries().length > 0) {
      <ul class="entry-list">
        @for (entry of store.entries(); track entry.id) {
          <li appMealRow [entry]="entry" [rowId]="entry.id"></li>
        }
      </ul>
    } @else if (store.isLoading()) {
      <p class="list-message">{{ t().loading }}</p>
    } @else {
      <p class="list-message">{{ t().noMeals }}</p>
    }
  `,
})
export class DishEntryListComponent {
  protected readonly t = inject(I18n).t;
  protected readonly store = inject(DishEntryStore);
  private readonly sync = inject(OfflineDataAccessService);
  private readonly uiStore = inject(UiStore);

  constructor() {
    // Loads initially, for another day and when the data changed
    effect(() => {
      this.sync.revision();
      const day = this.uiStore.selectedDay();
      untracked(() => void this.store.loadEntries(day));
    });
  }
}
