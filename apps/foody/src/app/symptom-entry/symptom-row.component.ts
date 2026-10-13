import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, viewChild } from '@angular/core';
import { ConfirmService } from '../shared/confirm/confirm.service';
import {
  entryActions,
  EntryMenuComponent,
  MenuAction,
} from '../shared/entry-menu.component';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { RowDirective } from '../shared/keyboard/row.directive';
import { LevelChipComponent } from '../shared/level.component';
import { UiStore } from '../shared/ui-store';
import { CourseLineComponent } from './course-line.component';
import { FollowUpSummaryComponent } from './follow-up-summary.component';
import {
  FOLLOW_UP_COLLECTION,
  SymptomEntry,
  SymptomEntryStore,
} from './symptom-entry-store';

/**
 * A symptom in a list of entries, with how it went on, and what can be done
 * with the entry
 */
@Component({
  // A list item itself, so the list it is in stays a list
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'li[appSymptomRow]',
  imports: [
    DatePipe,
    EntryMenuComponent,
    IconComponent,
    LevelChipComponent,
    CourseLineComponent,
    FollowUpSummaryComponent,
  ],
  hostDirectives: [{ directive: RowDirective, inputs: ['rowId'] }],
  host: { class: 'entry clickable', 'data-kind': 'symptom' },
  template: `
    <span class="time">{{ entry().date | date: 'HH:mm' }}</span>
    @if (showKind()) {
      <app-icon class="kind" name="symptom" />
    }
    @for (url of entry().locationImageUrls; track url) {
      <img [src]="url" alt="" />
    }
    <span class="content">
      <span class="name">{{ entry().symptomName }}</span>
      @if (entry().discomfortLevel; as level) {
        <app-level-chip [level]="level" [title]="t().discomfortLevel" />
      }
      <app-course-line [entry]="entry()" />
    </span>
    <app-entry-menu [label]="entry().symptomName" [actions]="actions()" />

    <!-- How the symptom went on: part of the entry, changed where the entry
         is edited -->
    @for (followUp of entry().followUps; track followUp.id) {
      <app-follow-up-summary
        class="follow-up"
        [followUp]="followUp"
        [start]="entry().date"
      />
    }
  `,
  styles: [
    `
      /* The follow-ups take lines of their own below the entry */
      :host {
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
export class SymptomRowComponent {
  protected readonly t = inject(I18n).t;
  private readonly uiStore = inject(UiStore);
  private readonly confirm = inject(ConfirmService);
  private readonly store = inject(SymptomEntryStore);

  readonly entry = input.required<SymptomEntry>();
  /** In a list of entries of all kinds, an icon says what the entry is */
  readonly showKind = input(false);

  private readonly menu = viewChild(EntryMenuComponent);

  /** What the menu of the entry offers */
  protected readonly actions = computed<MenuAction[]>(() => {
    const t = this.t();
    const { symptomId } = this.entry();
    return [
      {
        label: t.addFollowUp,
        icon: 'history',
        key: 'f',
        keyLabel: 'F',
        run: () => this.uiStore.edit('new-follow-up', this.entry().id),
      },
      ...entryActions(t, {
        edit: () => this.edit(),
        copy: () => this.copy(),
        details: symptomId
          ? () => this.uiStore.edit('view-symptom', symptomId)
          : null,
        remove: () => void this.remove(),
      }),
    ];
  });

  constructor() {
    const row = inject(RowDirective, { self: true });
    row.rowOpen.subscribe(() => this.menu()?.open());
    row.rowClick.subscribe(() => this.menu()?.toggle());
    row.rowEdit.subscribe(() => this.edit());
    row.rowCopy.subscribe(() => this.copy());
    row.rowDelete.subscribe(() => void this.remove());
  }

  private edit(): void {
    this.uiStore.edit('new-health-entry', this.entry().id);
  }

  private copy(): void {
    this.uiStore.copy('new-health-entry', this.entry().id);
  }

  private remove(): Promise<void> {
    const entry = this.entry();
    return this.confirm.delete(
      { id: entry.id, name: entry.symptomName },
      () => this.store.deleteSymptomEntry(entry.id),
      // The follow-ups are deleted with their entry
      [FOLLOW_UP_COLLECTION],
    );
  }
}
