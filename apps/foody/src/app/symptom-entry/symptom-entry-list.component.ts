import { Component, effect, inject, untracked } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { DatePipe } from '@angular/common';
import { ConfirmService } from '../shared/confirm/confirm.service';
import { IconComponent } from '../shared/icon.component';
import { UiStore } from '../shared/ui-store';
import { SymptomEntry, SymptomEntryStore } from './symptom-entry-store';

@Component({
  selector: 'app-symptom-entry-list',
  imports: [DatePipe, IconComponent],
  template: `
    @if (symptomEntryStore.error()) {
      <p class="list-message error">{{ symptomEntryStore.error() }}</p>
    } @else if (symptomEntryStore.entries().length > 0) {
      <ul class="entry-list">
        @for (entry of symptomEntryStore.entries(); track entry.id) {
          <li class="entry">
            <span class="time">{{ entry.date | date: 'HH:mm' }}</span>
            @for (url of entry.locationImageUrls; track url) {
              <img [src]="url" alt="" />
            }
            <span class="content">
              <button
                type="button"
                class="name"
                [disabled]="!entry.symptomId"
                (click)="uiStore.edit('view-symptom', entry.symptomId)"
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
          </li>
        }
      </ul>
    } @else if (symptomEntryStore.isLoading()) {
      <p class="list-message">{{ t().loading }}</p>
    } @else {
      <p class="list-message">{{ t().noSymptoms }}</p>
    }
  `,
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

  protected remove(entry: SymptomEntry): Promise<void> {
    return this.confirm.delete({ id: entry.id, name: entry.symptomName }, () =>
      this.symptomEntryStore.deleteSymptomEntry(entry.id),
    );
  }
}
