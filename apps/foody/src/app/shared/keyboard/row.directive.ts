import {
  effect,
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { UiStore } from '../ui-store';

/**
 * A row of a list that can be reached with the arrow keys (see
 * home.component) and acts on keys while it has the focus
 */
@Directive({
  selector: '[appRow]',
  host: {
    // Reached with the arrow keys; Tab leads to the buttons of the row
    tabindex: '-1',
    'data-row': '',
    '[attr.data-row-id]': 'rowId() || null',
    '(keydown)': 'onKey($event)',
    '(click)': 'onClick($event)',
  },
})
export class RowDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly uiStore = inject(UiStore);

  /**
   * The record of the row. With it the row gets the focus back after its
   * record was edited or created, and the focus moves on when it is deleted.
   */
  readonly rowId = input('');

  /** Enter */
  readonly rowOpen = output<void>();
  /** E */
  readonly rowEdit = output<void>();
  /** D */
  readonly rowCopy = output<void>();
  /** Delete */
  readonly rowDelete = output<void>();
  /** A click on the row itself, not on a button or a row within it */
  readonly rowClick = output<MouseEvent>();

  constructor() {
    // Also a row that exists already, as its list can stay behind a form
    effect(() => {
      if (!this.rowId() || this.rowId() !== this.uiStore.focusRowId()) return;
      this.uiStore.focusRowId.set(null);
      // After the row has been rendered and the form is gone
      setTimeout(() => this.host.nativeElement.focus());
    });
  }

  protected onKey(event: KeyboardEvent): void {
    // Keys pressed on a button of the row belong to the button
    if (event.target !== event.currentTarget) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const action = {
      Enter: this.rowOpen,
      e: this.rowEdit,
      d: this.rowCopy,
      Delete: this.rowDelete,
    }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!action) return;

    event.preventDefault();
    action.emit();
  }

  protected onClick(event: MouseEvent): void {
    const closest = (event.target as HTMLElement).closest(
      'button, a, [role=menu], [data-row]',
    );
    if (closest === this.host.nativeElement) this.rowClick.emit(event);
  }
}
