import { Component, effect, inject, untracked } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { DatePipe } from '@angular/common';
import { DishEntryStore } from './dish-entry-store';

@Component({
  selector: 'app-dish-entry-list',
  imports: [DatePipe],
  template: `
    @if (dishEntryStore.error()) {
      <p class="list-message error">{{ dishEntryStore.error() }}</p>
    } @else if (dishEntryStore.entries().length > 0) {
      <ul class="entry-list">
        @for (entry of dishEntryStore.entries(); track entry.id) {
          <li class="entry">
            <span class="time">{{ entry.date | date: 'HH:mm' }}</span>
            @if (entry.imageUrl) {
              <img [src]="entry.imageUrl" alt="" />
            }
            <span class="name">{{ entry.name }}</span>
            @if (entry.amount !== null) {
              <span class="chip">
                {{ entry.amount }} {{ i18n.name(entry.amountUnit) }}
              </span>
            }
          </li>
        }
      </ul>
    } @else if (dishEntryStore.isLoading()) {
      <p class="list-message">{{ t().loading }}</p>
    } @else {
      <p class="list-message">{{ t().noMeals }}</p>
    }
  `,
})
export class DishEntryListComponent {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  readonly dishEntryStore = inject(DishEntryStore);
  private readonly sync = inject(OfflineDataAccessService);

  constructor() {
    // Loads initially and whenever a synchronization changed the data
    effect(() => {
      this.sync.revision();
      untracked(() => void this.dishEntryStore.loadTodayEntries());
    });
  }
}
