import { Component, effect, inject, untracked } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { DatePipe } from '@angular/common';
import { ConfirmService } from '../shared/confirm/confirm.service';
import {
  EntryMenuComponent,
  entryActions,
  MenuAction,
} from '../shared/entry-menu.component';
import { RowDirective } from '../shared/keyboard/row.directive';
import { UiStore } from '../shared/ui-store';
import { FollowUpSummaryComponent } from './follow-up-summary.component';
import {
  FOLLOW_UP_COLLECTION,
  SymptomEntry,
  SymptomEntryStore,
} from './symptom-entry-store';

@Component({
  selector: 'app-symptom-entry-list',
  imports: [
    DatePipe,
    RowDirective,
    EntryMenuComponent,
    FollowUpSummaryComponent,
  ],
  template: `
    @if (symptomEntryStore.error()) {
      <p class="list-message error">{{ symptomEntryStore.error() }}</p>
    } @else if (symptomEntryStore.entries().length > 0) {
      <ul class="entry-list">
        @for (entry of symptomEntryStore.entries(); track entry.id) {
          <li
            class="entry clickable"
            appRow
            [attr.data-entry-id]="entry.id"
            (rowOpen)="menu.open()"
            (rowClick)="menu.toggle()"
            (rowEdit)="uiStore.edit('new-health-entry', entry.id)"
            (rowDelete)="remove(entry)"
          >
            <span class="time">{{ entry.date | date: 'HH:mm' }}</span>
            @for (url of entry.locationImageUrls; track url) {
              <img [src]="url" alt="" />
            }
            <span class="content">
              <span class="name">{{ entry.symptomName }}</span>
              @if (entry.discomfortLevel !== null) {
                <span
                  class="chip"
                  [class.medium]="
                    entry.discomfortLevel > 33 && entry.discomfortLevel <= 66
                  "
                  [class.high]="entry.discomfortLevel > 66"
                  [title]="t().discomfortLevel"
                >
                  {{ entry.discomfortLevel }}/100
                </span>
              }
            </span>
            <app-entry-menu
              #menu
              [label]="entry.symptomName"
              [actions]="actions(entry)"
            />

            <!-- How the symptom went on: part of the entry, changed where
                 the entry is edited -->
            @for (followUp of entry.followUps; track followUp.id) {
              <app-follow-up-summary
                class="follow-up"
                [followUp]="followUp"
                [start]="entry.date"
              />
            }
          </li>
        }
      </ul>
    } @else if (symptomEntryStore.isLoading()) {
      <p class="list-message">{{ t().loading }}</p>
    } @else {
      <p class="list-message">{{ t().noSymptoms }}</p>
    }
  `,
  styles: [
    `
      /* The follow-ups take lines of their own below the entry */
      .entry {
        flex-wrap: wrap;
      }

      .follow-up {
        flex-basis: 100%;
        /* In line with the name, next to the time of the entry */
        margin-left: calc(3rem + 12px);
        padding: 2px 0 2px 10px;
        border-left: 2px solid var(--border);
      }
    `,
  ],
})
export class SymptomEntryListComponent {
  protected readonly t = inject(I18n).t;
  readonly symptomEntryStore = inject(SymptomEntryStore);
  private readonly sync = inject(OfflineDataAccessService);
  private readonly confirm = inject(ConfirmService);
  protected readonly uiStore = inject(UiStore);

  constructor() {
    // Loads initially, for another day and after a synchronization
    effect(() => {
      this.sync.revision();
      const day = this.uiStore.selectedDay();
      untracked(() => void this.symptomEntryStore.loadEntries(day));
    });
  }

  /** What the menu of an entry offers */
  protected actions(entry: SymptomEntry): MenuAction[] {
    const t = this.t();
    return [
      {
        label: t.addFollowUp,
        icon: 'history',
        key: 'f',
        keyLabel: 'F',
        run: () => this.uiStore.edit('new-follow-up', entry.id),
      },
      ...entryActions(t, {
        edit: () => this.uiStore.edit('new-health-entry', entry.id),
        details: entry.symptomId
          ? () => this.uiStore.edit('view-symptom', entry.symptomId)
          : null,
        remove: () => void this.remove(entry),
      }),
    ];
  }

  protected remove(entry: SymptomEntry): Promise<void> {
    return this.confirm.delete(
      { id: entry.id, name: entry.symptomName },
      () => this.symptomEntryStore.deleteSymptomEntry(entry.id),
      // The follow-ups are deleted with their entry
      [FOLLOW_UP_COLLECTION],
    );
  }
}
