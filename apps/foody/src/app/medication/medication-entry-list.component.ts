import { DatePipe } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { ConfirmService } from '../shared/confirm/confirm.service';
import { I18n } from '../shared/i18n/i18n';
import {
  entryActions,
  EntryMenuComponent,
  MenuAction,
} from '../shared/entry-menu.component';
import { RowDirective } from '../shared/keyboard/row.directive';
import { UiStore } from '../shared/ui-store';
import {
  MedicationEntry,
  MedicationEntryStore,
} from './medication-entry-store';

@Component({
  selector: 'app-medication-entry-list',
  imports: [DatePipe, RowDirective, EntryMenuComponent],
  template: `
    @if (store.error()) {
      <p class="list-message error">{{ store.error() }}</p>
    } @else if (store.entries().length > 0) {
      <ul class="entry-list">
        @for (entry of store.entries(); track entry.id) {
          <li
            class="entry clickable"
            appRow
            [rowId]="entry.id"
            (rowOpen)="menu.open()"
            (rowCopy)="uiStore.copy('new-medication-entry', entry.id)"
            (rowClick)="menu.toggle()"
            (rowEdit)="uiStore.edit('new-medication-entry', entry.id)"
            (rowDelete)="remove(entry)"
          >
            <span class="time">{{ entry.date | date: 'HH:mm' }}</span>
            @if (entry.imageUrl) {
              <img [src]="entry.imageUrl" alt="" />
            }
            <span class="content">
              <span class="name">
                {{ entry.name }}
                @if (entry.strength) {
                  <span class="strength">{{ entry.strength }}</span>
                }
              </span>
              @if (entry.amount !== null) {
                <span class="chip">
                  {{ entry.amount }} {{ i18n.name(entry.amountUnit) }}
                </span>
              }
              @if (entry.comment) {
                <span class="comment">{{ entry.comment }}</span>
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
    } @else if (store.isLoading()) {
      <p class="list-message">{{ t().loading }}</p>
    } @else {
      <p class="list-message">{{ t().noMedications }}</p>
    }
  `,
  styles: [
    `
      .strength {
        font-weight: 400;
        color: var(--text-muted);
      }

      .comment {
        flex-basis: 100%;
        font-size: 0.85rem;
        color: var(--text-muted);
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class MedicationEntryListComponent {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly store = inject(MedicationEntryStore);
  protected readonly uiStore = inject(UiStore);
  private readonly sync = inject(OfflineDataAccessService);
  private readonly confirm = inject(ConfirmService);

  constructor() {
    // Loads initially, for another day and after a synchronization
    effect(() => {
      this.sync.revision();
      const day = this.uiStore.selectedDay();
      untracked(() => void this.store.loadEntries(day));
    });
  }

  /** What the menu of an entry offers */
  protected actions(entry: MedicationEntry): MenuAction[] {
    return entryActions(this.t(), {
      edit: () => this.uiStore.edit('new-medication-entry', entry.id),
      copy: () => this.uiStore.copy('new-medication-entry', entry.id),
      details: entry.medicationId
        ? () => this.uiStore.edit('view-medication', entry.medicationId)
        : null,
      remove: () => void this.remove(entry),
    });
  }

  protected remove(entry: MedicationEntry): Promise<void> {
    return this.confirm.delete(entry, () => this.store.deleteEntry(entry.id));
  }
}
