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
import { UiStore } from '../shared/ui-store';
import { DishEntry, DishEntryStore } from './dish-entry-store';
import { MealSelection } from './meal-selection';

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
    '[class.selected]': 'isSelected()',
    '[attr.aria-selected]': 'isSelected() || null',
    '(keydown.space)': 'toggleByKey($event)',
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
  private readonly selection = inject(MealSelection);

  readonly entry = input.required<DishEntry>();
  /** In a list of entries of all kinds, an icon says what the entry is */
  readonly showKind = input(false);
  /** Eaten together with the entry before it, which shows the time */
  readonly continues = input(false);

  private readonly menu = viewChild(EntryMenuComponent);

  protected readonly isSelected = computed(() =>
    this.selection.has(this.entry().id),
  );

  /** What the menu of the entry offers */
  protected readonly actions = computed<MenuAction[]>(() => {
    const entry = this.entry();
    const id = entry.dishId || entry.foodItemId;
    const t = this.i18n.t();
    const select: MenuAction = {
      label: this.isSelected() ? t.deselect : t.select,
      icon: 'check',
      key: ' ',
      keyLabel: t.keySpace,
      run: () => this.selection.toggle(entry.id),
    };
    const [edit, ...others] = entryActions(t, {
      edit: () => this.edit(),
      copy: () => this.copy(),
      details: id
        ? () => this.uiStore.edit(entry.dishId ? 'view-dish' : 'view-food', id)
        : null,
      remove: () => void this.remove(),
    });
    return [edit, select, ...others];
  });

  constructor() {
    const row = inject(RowDirective, { self: true });
    row.rowOpen.subscribe(() => this.menu()?.open());
    row.rowClick.subscribe((event) => {
      // With Ctrl, or once something is selected, a click selects
      if (event.ctrlKey || event.metaKey || this.selection.count() > 0) {
        this.menu()?.close();
        this.selection.toggle(this.entry().id);
      } else {
        this.menu()?.toggle();
      }
    });
    row.rowEdit.subscribe(() => this.edit());
    row.rowCopy.subscribe(() => this.copy());
    row.rowDelete.subscribe(() => void this.remove());
  }

  private edit(): void {
    this.uiStore.edit('new-meal', this.entry().id);
  }

  /** Logs the entry again, or all that is selected */
  private copy(): void {
    const ids = this.selection.ids();
    this.uiStore.copy(
      'new-meal',
      ids.length > 0 ? ids.join(',') : this.entry().id,
    );
  }

  protected toggleByKey(event: Event): void {
    // Space on a button of the row belongs to the button
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.selection.toggle(this.entry().id);
  }

  private remove(): Promise<void> {
    const entry = this.entry();
    return this.confirm.delete(entry, () =>
      this.store.deleteDishEntry(entry.id),
    );
  }
}
