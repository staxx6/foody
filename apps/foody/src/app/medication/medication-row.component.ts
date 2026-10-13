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
import {
  MedicationEntry,
  MedicationEntryStore,
} from './medication-entry-store';

/**
 * A medication that was taken in a list of entries, and what can be done
 * with the entry
 */
@Component({
  // A list item itself, so the list it is in stays a list
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'li[appMedicationRow]',
  imports: [DatePipe, EntryMenuComponent, IconComponent],
  hostDirectives: [{ directive: RowDirective, inputs: ['rowId'] }],
  host: { class: 'entry clickable', 'data-kind': 'medication' },
  template: `
    <span class="time">{{ entry().date | date: 'HH:mm' }}</span>
    @if (showKind()) {
      <app-icon class="kind" name="pill" />
    }
    @if (entry().imageUrl; as url) {
      <img [src]="url" alt="" />
    }
    <span class="content">
      <span class="name">
        {{ entry().name }}
        @if (entry().strength) {
          <span class="strength">{{ entry().strength }}</span>
        }
      </span>
      @if (entry().amount !== null) {
        <span class="chip">
          {{ entry().amount }} {{ i18n.name(entry().amountUnit) }}
        </span>
      }
      @if (entry().comment) {
        <span class="comment">{{ entry().comment }}</span>
      }
    </span>
    <app-entry-menu [label]="entry().name" [actions]="actions()" />
  `,
  styles: [
    `
      .strength {
        font-weight: 400;
        color: var(--text-muted);
      }

      .comment {
        flex-basis: 100%;
        font-size: 0.85rem;
        color: var(--text-muted);
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class MedicationRowComponent {
  protected readonly i18n = inject(I18n);
  private readonly uiStore = inject(UiStore);
  private readonly confirm = inject(ConfirmService);
  private readonly store = inject(MedicationEntryStore);

  readonly entry = input.required<MedicationEntry>();
  /** In a list of entries of all kinds, an icon says what the entry is */
  readonly showKind = input(false);

  private readonly menu = viewChild(EntryMenuComponent);

  /** What the menu of the entry offers */
  protected readonly actions = computed(() => {
    const { medicationId } = this.entry();
    return entryActions(this.i18n.t(), {
      edit: () => this.edit(),
      copy: () => this.copy(),
      details: medicationId
        ? () => this.uiStore.edit('view-medication', medicationId)
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
    this.uiStore.edit('new-medication-entry', this.entry().id);
  }

  private copy(): void {
    this.uiStore.copy('new-medication-entry', this.entry().id);
  }

  private remove(): Promise<void> {
    const entry = this.entry();
    return this.confirm.delete(entry, () => this.store.deleteEntry(entry.id));
  }
}
