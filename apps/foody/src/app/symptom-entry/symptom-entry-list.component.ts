import { Component, effect, inject, untracked } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { DatePipe } from '@angular/common';
import { ConfirmService } from '../shared/confirm/confirm.service';
import { elapsed, fromPocketBaseDate, isSameDay } from '../shared/date-utils';
import { IconComponent } from '../shared/icon.component';
import { RowDirective } from '../shared/keyboard/row.directive';
import { UiStore } from '../shared/ui-store';
import {
  FOLLOW_UP_COLLECTION,
  SymptomEntry,
  SymptomEntryStore,
  SymptomFollowUp,
} from './symptom-entry-store';

@Component({
  selector: 'app-symptom-entry-list',
  imports: [DatePipe, IconComponent, RowDirective],
  template: `
    @if (symptomEntryStore.error()) {
      <p class="list-message error">{{ symptomEntryStore.error() }}</p>
    } @else if (symptomEntryStore.entries().length > 0) {
      <ul class="entry-list">
        @for (entry of symptomEntryStore.entries(); track entry.id) {
          <li
            class="entry"
            appRow
            (rowOpen)="showDetails(entry)"
            (rowEdit)="uiStore.edit('new-health-entry', entry.id)"
            (rowDelete)="remove(entry)"
          >
            <span class="time">{{ entry.date | date: 'HH:mm' }}</span>
            @for (url of entry.locationImageUrls; track url) {
              <img [src]="url" alt="" />
            }
            <span class="content">
              <button
                type="button"
                class="name"
                [disabled]="!entry.symptomId"
                (click)="showDetails(entry)"
                [title]="t().showDetails"
              >
                {{ entry.symptomName }}
              </button>
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
            <button
              type="button"
              class="icon-btn add-follow-up"
              (click)="uiStore.edit('new-follow-up', entry.id)"
              [attr.aria-label]="t().addFollowUpFor(entry.symptomName)"
              [title]="t().addFollowUp"
            >
              <app-icon name="history" />
            </button>
            <button
              type="button"
              class="icon-btn"
              (click)="uiStore.edit('new-health-entry', entry.id)"
              [attr.aria-label]="t().editNamed(entry.symptomName)"
            >
              <app-icon name="edit" />
            </button>
            <button
              type="button"
              class="icon-btn danger"
              (click)="remove(entry)"
              [attr.aria-label]="t().deleteNamed(entry.symptomName)"
            >
              <app-icon name="trash" />
            </button>

            <!-- How the symptom went on, below the entry -->
            @for (followUp of entry.followUps; track followUp.id) {
              <div
                class="follow-up"
                appRow
                (rowOpen)="uiStore.edit('edit-follow-up', followUp.id)"
                (rowEdit)="uiStore.edit('edit-follow-up', followUp.id)"
                (rowDelete)="removeFollowUp(entry, followUp)"
              >
                <button
                  type="button"
                  class="summary"
                  (click)="uiStore.edit('edit-follow-up', followUp.id)"
                  [title]="t().editFollowUp"
                >
                  <span class="when">{{ when(entry, followUp) }}</span>
                  <span class="chip" [attr.data-course]="followUp.course">
                    {{ t().courses[followUp.course] }}
                  </span>
                  @if (followUp.discomfortLevel !== null) {
                    <span
                      class="chip"
                      [class.medium]="
                        followUp.discomfortLevel > 33 &&
                        followUp.discomfortLevel <= 66
                      "
                      [class.high]="followUp.discomfortLevel > 66"
                    >
                      {{ followUp.discomfortLevel }}/100
                    </span>
                  }
                  @if (followUp.comment) {
                    <span class="comment">{{ followUp.comment }}</span>
                  }
                </button>
                <button
                  type="button"
                  class="icon-btn danger"
                  (click)="removeFollowUp(entry, followUp)"
                  [attr.aria-label]="
                    t().deleteNamed(followUpName(entry, followUp))
                  "
                >
                  <app-icon name="trash" />
                </button>
              </div>
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
        display: flex;
        align-items: center;
        gap: 12px;
        /* In line with the name, next to the time of the entry */
        margin-left: calc(3rem + 12px);
        padding-left: 10px;
        border-left: 2px solid var(--border);
      }

      .summary {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        padding: 2px 0;
        border: none;
        background: none;
        color: var(--text);
        font: inherit;
        font-size: 0.85rem;
        text-align: left;
        cursor: pointer;
      }

      .when {
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }

      .chip[data-course] {
        background: var(--bg);
        color: var(--text);
      }

      .chip[data-course='better'],
      .chip[data-course='gone'] {
        color: var(--success);
      }

      .chip[data-course='worse'] {
        color: var(--danger);
      }

      .comment {
        flex-basis: 100%;
        color: var(--text-muted);
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class SymptomEntryListComponent {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
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

  protected showDetails(entry: SymptomEntry): void {
    if (entry.symptomId) this.uiStore.edit('view-symptom', entry.symptomId);
  }

  /** e.g. "14:30 · after 3 h", with the day if it is another one */
  protected when(entry: SymptomEntry, followUp: SymptomFollowUp): string {
    const start = fromPocketBaseDate(entry.date);
    const date = fromPocketBaseDate(followUp.date);
    const { hours, minutes } = elapsed(start, date);
    const time = new Intl.DateTimeFormat(this.i18n.language(), {
      ...(isSameDay(start, date) ? {} : { day: 'numeric', month: 'short' }),
      hour: '2-digit',
      minute: '2-digit',
      // Like the times of the entries
      hourCycle: 'h23',
    }).format(date);
    return `${time} · ${this.t().afterDuration(hours, minutes)}`;
  }

  /** What the follow-up is called when asking whether to delete it */
  protected followUpName(
    entry: SymptomEntry,
    followUp: SymptomFollowUp,
  ): string {
    return `${this.t().followUp} ${entry.symptomName} (${this.when(entry, followUp)})`;
  }

  protected remove(entry: SymptomEntry): Promise<void> {
    return this.confirm.delete(
      { id: entry.id, name: entry.symptomName },
      () => this.symptomEntryStore.deleteSymptomEntry(entry.id),
      // The follow-ups are deleted with their entry
      [FOLLOW_UP_COLLECTION],
    );
  }

  protected removeFollowUp(
    entry: SymptomEntry,
    followUp: SymptomFollowUp,
  ): Promise<void> {
    return this.confirm.delete(
      { id: followUp.id, name: this.followUpName(entry, followUp) },
      () => this.symptomEntryStore.deleteFollowUp(followUp.id),
    );
  }
}
