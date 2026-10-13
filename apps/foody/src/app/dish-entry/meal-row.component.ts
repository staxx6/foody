import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, viewChild } from '@angular/core';
import { ConfirmService } from '../shared/confirm/confirm.service';
import {
  entryActions,
  EntryMenuComponent,
} from '../shared/entry-menu.component';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { RowDirective } from '../shared/keyboard/row.directive';
import { UiStore } from '../shared/ui-store';
import { DishEntry, DishEntryStore } from './dish-entry-store';

/**
 * A meal in a list of entries: what was eaten when, and what can be done
 * with the entry
 */
@Component({
  // A list item itself, so the list it is in stays a list
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'li[appMealRow]',
  imports: [DatePipe, EntryMenuComponent, IconComponent],
  hostDirectives: [{ directive: RowDirective, inputs: ['rowId'] }],
  host: {
    class: 'entry clickable',
    'data-kind': 'meal',
    '[class.continues]': 'continues()',
  },
  template: `
    <span class="time">{{ entry().date | date: 'HH:mm' }}</span>
    @if (showKind()) {
      <app-icon class="kind" name="meal" />
    }
    @if (entry().imageUrl; as url) {
      <img [src]="url" alt="" />
    }
    <span class="content">
      <span class="name">{{ entry().name }}</span>
      @if (entry().amount !== null) {
        <span class="chip">
          {{ entry().amount }} {{ i18n.name(entry().amountUnit) }}
        </span>
      }
    </span>
    <app-entry-menu [label]="entry().name" [actions]="actions()" />
  `,
})
export class MealRowComponent {
  protected readonly i18n = inject(I18n);
  private readonly uiStore = inject(UiStore);
  private readonly confirm = inject(ConfirmService);
  private readonly store = inject(DishEntryStore);

  readonly entry = input.required<DishEntry>();
  /** In a list of entries of all kinds, an icon says what the entry is */
  readonly showKind = input(false);
  /** Eaten together with the entry before it, which shows the time */
  readonly continues = input(false);

  private readonly menu = viewChild(EntryMenuComponent);

  /** What the menu of the entry offers */
  protected readonly actions = computed(() => {
    const entry = this.entry();
    const id = entry.dishId || entry.foodItemId;
    return entryActions(this.i18n.t(), {
      edit: () => this.edit(),
      copy: () => this.copy(),
      details: id
        ? () => this.uiStore.edit(entry.dishId ? 'view-dish' : 'view-food', id)
        : null,
      remove: () => void this.remove(),
    });
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
    this.uiStore.edit('new-meal', this.entry().id);
  }

  private copy(): void {
    this.uiStore.copy('new-meal', this.entry().id);
  }

  private remove(): Promise<void> {
    const entry = this.entry();
    return this.confirm.delete(entry, () =>
      this.store.deleteDishEntry(entry.id),
    );
  }
}
