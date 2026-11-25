import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, viewChild } from '@angular/core';
import { ConfirmService } from '../shared/confirm/confirm.service';
import {
  entryActions,
  EntryMenuComponent,
} from '../shared/entry-menu.component';
import { I18n } from '../shared/i18n/i18n';
import { RowDirective } from '../shared/keyboard/row.directive';
import { UiStore } from '../shared/ui-store';
import { Weight, WeightStore } from './weight-store';

/**
 * A logged weight, and what can be done with it
 */
@Component({
  // A list item itself, so the list it is in stays a list
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'li[appWeightRow]',
  imports: [DatePipe, EntryMenuComponent],
  hostDirectives: [{ directive: RowDirective, inputs: ['rowId'] }],
  host: { class: 'entry clickable', 'data-kind': 'weight' },
  template: `
    <span class="time">{{ weight().date | date: 'HH:mm' }}</span>
    <span class="text">{{ name() }}</span>
    <app-entry-menu [label]="name()" [actions]="actions()" />
  `,
  styles: [
    `
      .text {
        flex: 1;
        min-width: 0;
        font-weight: 600;
      }
    `,
  ],
})
export class WeightRowComponent {
  private readonly i18n = inject(I18n);
  private readonly uiStore = inject(UiStore);
  private readonly confirm = inject(ConfirmService);
  private readonly store = inject(WeightStore);

  readonly weight = input.required<Weight>();

  private readonly menu = viewChild(EntryMenuComponent);

  /** e.g. "72.4 kg" */
  protected readonly name = computed(() =>
    this.i18n.formatKilograms(this.weight().kilograms),
  );

  /** What the menu of the weight offers */
  protected readonly actions = computed(() =>
    entryActions(this.i18n.t(), {
      edit: () => this.edit(),
      details: null,
      remove: () => void this.remove(),
    }),
  );

  constructor() {
    const row = inject(RowDirective, { self: true });
    row.rowOpen.subscribe(() => this.menu()?.open());
    row.rowClick.subscribe(() => this.menu()?.toggle());
    row.rowEdit.subscribe(() => this.edit());
    row.rowDelete.subscribe(() => void this.remove());
  }

  private edit(): void {
    this.uiStore.edit('new-weight', this.weight().id);
  }

  private remove(): Promise<void> {
    const { id } = this.weight();
    return this.confirm.delete({ id, name: this.name() }, () =>
      this.store.deleteWeight(id),
    );
  }
}
