import { Directive, output } from '@angular/core';

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
    '(keydown)': 'onKey($event)',
  },
})
export class RowDirective {
  /** Enter */
  readonly rowOpen = output<void>();
  /** E */
  readonly rowEdit = output<void>();
  /** Delete */
  readonly rowDelete = output<void>();

  protected onKey(event: KeyboardEvent): void {
    // Keys pressed on a button of the row belong to the button
    if (event.target !== event.currentTarget) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const action = {
      Enter: this.rowOpen,
      e: this.rowEdit,
      Delete: this.rowDelete,
    }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!action) return;

    event.preventDefault();
    action.emit();
  }
}
