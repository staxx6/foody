import { Component, effect, inject, untracked } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { DatePipe } from '@angular/common';
import { DishEntryStore } from './dish-entry-store';

@Component({
  selector: 'app-dish-entry-list',
  imports: [DatePipe],
  template: `
    @if (dishEntryStore.isLoading()) {
      <p>Lade Einträge...</p>
    } @else if (dishEntryStore.error()) {
      <p>Fehler: {{ dishEntryStore.error() }}</p>
    } @else if (dishEntryStore.entries().length === 0) {
      <p>Keine Einträge für heute.</p>
    } @else {
      <ul>
        @for (entry of dishEntryStore.entries(); track entry.id) {
          <li>
            @if (entry.imageUrl) {
              <img [src]="entry.imageUrl" [alt]="entry.name" />
            }
            {{ entry.name }}
            @if (entry.amount !== null) {
              – {{ entry.amount
              }}{{ entry.amountUnitName ? ' ' + entry.amountUnitName : '' }}
            }
            <span>({{ entry.date | date: 'HH:mm' }})</span>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      img {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 4px;
        vertical-align: middle;
      }
    `,
  ],
})
export class DishEntryListComponent {
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
