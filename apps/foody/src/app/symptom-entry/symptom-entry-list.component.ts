import { Component, effect, inject, untracked } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { DatePipe } from '@angular/common';
import { SymptomEntryStore } from './symptom-entry-store';

@Component({
  selector: 'app-symptom-entry-list',
  imports: [DatePipe],
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

  constructor() {
    // Loads initially and whenever a synchronization changed the data
    effect(() => {
      this.sync.revision();
      untracked(() => void this.symptomEntryStore.loadTodayEntries());
    });
  }
}
