import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, viewChild } from '@angular/core';
import { ConfirmService } from '../shared/confirm/confirm.service';
import { fromPocketBaseDate, isSameDay } from '../shared/date-utils';
import { EntryMenuComponent, MenuAction } from '../shared/entry-menu.component';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { RowDirective } from '../shared/keyboard/row.directive';
import { UiStore } from '../shared/ui-store';
import {
  followUpTime,
  FollowUpSummaryComponent,
} from './follow-up-summary.component';
import {
  SymptomEntry,
  SymptomEntryStore,
  SymptomFollowUp,
} from './symptom-entry-store';

/**
 * A follow-up of a symptom at its own time in the timeline of a day, so the
 * day reads in the order it happened
 */
@Component({
  // A list item itself, so the list it is in stays a list
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'li[appFollowUpRow]',
  imports: [
    DatePipe,
    EntryMenuComponent,
    IconComponent,
    FollowUpSummaryComponent,
  ],
  hostDirectives: [{ directive: RowDirective, inputs: ['rowId'] }],
  host: {
    class: 'entry clickable',
    'data-kind': 'follow-up',
    // F adds another follow-up to the same entry, see DayComponent
    '[attr.data-entry-id]': 'entry().id',
  },
  template: `
    <span class="time">{{ followUp().date | date: 'HH:mm' }}</span>
    <app-icon class="kind" name="history" />
    <span class="content">
      <span class="name">{{ entry().symptomName }}</span>
      <app-follow-up-summary
        [followUp]="followUp()"
        [start]="entry().date"
        [withTime]="isOtherDay()"
      />
    </span>
    <app-entry-menu [label]="name()" [actions]="actions()" />
  `,
  styles: [
    `
      /* Belongs to its symptom, so it reads as less than an entry */
      .name {
        font-weight: 400;
        color: var(--text-muted);
      }
    `,
  ],
})
export class FollowUpRowComponent {
  private readonly i18n = inject(I18n);
  private readonly uiStore = inject(UiStore);
  private readonly confirm = inject(ConfirmService);
  private readonly store = inject(SymptomEntryStore);

  readonly followUp = input.required<SymptomFollowUp>();
  /** The symptom entry it belongs to */
  readonly entry = input.required<SymptomEntry>();

  private readonly menu = viewChild(EntryMenuComponent);

  /** On another day than the entry, the line also says which day */
  protected readonly isOtherDay = computed(
    () =>
      !isSameDay(
        fromPocketBaseDate(this.entry().date),
        fromPocketBaseDate(this.followUp().date),
      ),
  );

  /** What it is called, e.g. when it was deleted */
  protected readonly name = computed(() => {
    const time = followUpTime(
      this.i18n,
      fromPocketBaseDate(this.entry().date),
      fromPocketBaseDate(this.followUp().date),
    );
    return `${this.i18n.t().followUp} ${this.entry().symptomName} (${time})`;
  });

  /** What the menu of the follow-up offers */
  protected readonly actions = computed<MenuAction[]>(() => {
    const t = this.i18n.t();
    return [
      {
        label: t.addFollowUp,
        icon: 'history',
        key: 'f',
        keyLabel: 'F',
        run: () => this.uiStore.edit('new-follow-up', this.entry().id),
      },
      {
        label: t.edit,
        icon: 'edit',
        key: 'e',
        keyLabel: 'E',
        run: () => this.edit(),
      },
      {
        label: t.delete,
        icon: 'trash',
        key: 'Delete',
        keyLabel: t.keyDelete,
        danger: true,
        run: () => void this.remove(),
      },
    ];
  });

  constructor() {
    const row = inject(RowDirective, { self: true });
    row.rowOpen.subscribe(() => this.menu()?.open());
    row.rowClick.subscribe(() => this.menu()?.toggle());
    row.rowEdit.subscribe(() => this.edit());
    row.rowDelete.subscribe(() => void this.remove());
  }

  private edit(): void {
    this.uiStore.edit('edit-follow-up', this.followUp().id);
  }

  private remove(): Promise<void> {
    const { id } = this.followUp();
    return this.confirm.delete({ id, name: this.name() }, () =>
      this.store.deleteFollowUp(id),
    );
  }
}
