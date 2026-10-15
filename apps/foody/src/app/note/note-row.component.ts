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
import { Note, NoteStore } from './note-store';

/** How much of a note names it, e.g. in the message after deleting it */
const NAME_LENGTH = 40;

/**
 * A note on a day, and what can be done with it
 */
@Component({
  // A list item itself, so the list it is in stays a list
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'li[appNoteRow]',
  imports: [DatePipe, EntryMenuComponent],
  hostDirectives: [{ directive: RowDirective, inputs: ['rowId'] }],
  host: { class: 'entry clickable', 'data-kind': 'note' },
  template: `
    <span class="time">{{ note().date | date: 'HH:mm' }}</span>
    <span class="text">{{ note().text }}</span>
    <app-entry-menu [label]="name()" [actions]="actions()" />
  `,
  styles: [
    `
      :host {
        align-items: flex-start;
      }

      .text {
        flex: 1;
        min-width: 0;
        /* Lines as they were written */
        white-space: pre-line;
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class NoteRowComponent {
  private readonly i18n = inject(I18n);
  private readonly uiStore = inject(UiStore);
  private readonly confirm = inject(ConfirmService);
  private readonly store = inject(NoteStore);

  readonly note = input.required<Note>();

  private readonly menu = viewChild(EntryMenuComponent);

  /** The beginning of the note, as a note has no name */
  protected readonly name = computed(() => {
    const text = this.note().text.replace(/\s+/g, ' ').trim();
    return text.length > NAME_LENGTH
      ? `${text.slice(0, NAME_LENGTH).trim()}…`
      : text;
  });

  /** What the menu of the note offers */
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
    this.uiStore.edit('new-note', this.note().id);
  }

  private remove(): Promise<void> {
    const { id } = this.note();
    return this.confirm.delete({ id, name: this.name() }, () =>
      this.store.deleteNote(id),
    );
  }
}
