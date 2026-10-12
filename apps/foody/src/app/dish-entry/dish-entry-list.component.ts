import { Component, effect, inject, untracked } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { DatePipe } from '@angular/common';
import { ConfirmService } from '../shared/confirm/confirm.service';
import {
  entryActions,
  EntryMenuComponent,
  MenuAction,
} from '../shared/entry-menu.component';
import { RowDirective } from '../shared/keyboard/row.directive';
import { UiStore } from '../shared/ui-store';
import { DishEntry, DishEntryStore } from './dish-entry-store';

@Component({
  selector: 'app-dish-entry-list',
  imports: [DatePipe, RowDirective, EntryMenuComponent],
  template: `
    @if (dishEntryStore.error()) {
      <p class="list-message error">{{ dishEntryStore.error() }}</p>
    } @else if (dishEntryStore.entries().length > 0) {
      <ul class="entry-list">
        @for (entry of dishEntryStore.entries(); track entry.id) {
          <li
            class="entry clickable"
            appRow
            [rowId]="entry.id"
            (rowOpen)="menu.open()"
            (rowCopy)="uiStore.copy('new-meal', entry.id)"
            (rowClick)="menu.toggle()"
            (rowEdit)="uiStore.edit('new-meal', entry.id)"
            (rowDelete)="remove(entry)"
          >
            <span class="time">{{ entry.date | date: 'HH:mm' }}</span>
            @if (entry.imageUrl) {
              <img [src]="entry.imageUrl" alt="" />
            }
            <span class="content">
              <span class="name">{{ entry.name }}</span>
              @if (entry.amount !== null) {
                <span class="chip">
                  {{ entry.amount }} {{ i18n.name(entry.amountUnit) }}
                </span>
              }
            </span>
            <app-entry-menu
              #menu
              [label]="entry.name"
              [actions]="actions(entry)"
            />
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
  private readonly confirm = inject(ConfirmService);
  protected readonly uiStore = inject(UiStore);

  constructor() {
    // Loads initially, for another day and after a synchronization
    effect(() => {
      this.sync.revision();
      const day = this.uiStore.selectedDay();
      untracked(() => void this.dishEntryStore.loadEntries(day));
    });
  }

  /** What the menu of an entry offers */
  protected actions(entry: DishEntry): MenuAction[] {
    const id = entry.dishId || entry.foodItemId;
    return entryActions(this.t(), {
      edit: () => this.uiStore.edit('new-meal', entry.id),
      copy: () => this.uiStore.copy('new-meal', entry.id),
      details: id
        ? () => this.uiStore.edit(entry.dishId ? 'view-dish' : 'view-food', id)
        : null,
      remove: () => void this.remove(entry),
    });
  }

  protected remove(entry: DishEntry): Promise<void> {
    return this.confirm.delete(entry, () =>
      this.dishEntryStore.deleteDishEntry(entry.id),
    );
  }
}
