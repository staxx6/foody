import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SymptomEntryStore } from './symptom-entry-store';

@Component({
  selector: 'app-symptom-entry-list',
  imports: [DatePipe],
  template: `
    @if (symptomEntryStore.isLoading()) {
      <p>Lade Symptome...</p>
    } @else if (symptomEntryStore.error()) {
      <p>Fehler: {{ symptomEntryStore.error() }}</p>
    } @else if (symptomEntryStore.entries().length === 0) {
      <p>Keine Symptome für heute.</p>
    } @else {
      <ul>
        @for (entry of symptomEntryStore.entries(); track entry.id) {
          <li>
            @if (entry.locationImageUrls.length > 0) {
              <span class="locations">
                @for (url of entry.locationImageUrls; track url) {
                  <img [src]="url" alt="Symptom-Location" />
                }
              </span>
            }
            {{ entry.symptomName }}
            @if (entry.discomfortLevel !== null) {
              – {{ entry.discomfortLevel }}/100
            }
            <span>({{ entry.date | date: 'HH:mm' }})</span>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .locations img {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 4px;
        vertical-align: middle;
        margin-left: 4px;
      }
    `,
  ],
})
export class SymptomEntryListComponent implements OnInit {
  readonly symptomEntryStore = inject(SymptomEntryStore);

  ngOnInit() {
    void this.symptomEntryStore.loadTodayEntries();
  }
}
