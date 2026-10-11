import {
  afterNextRender,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { isWideScreen } from './keyboard';

/**
 * Puts the focus into the field when it appears, so a form can be filled in
 * right away. Not on small screens, where it would open the on-screen keyboard.
 */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** `[appAutofocus]="false"` leaves the focus where it is */
  readonly enabled = input(true, {
    alias: 'appAutofocus',
    transform: (value: boolean | '') => value !== false,
  });

  constructor() {
    afterNextRender(() => {
      if (!this.enabled() || !isWideScreen()) return;
      const host = this.host.nativeElement;
      // On a component, e.g. the search select, its field is meant
      const field = host.matches('input, textarea, button')
        ? host
        : host.querySelector<HTMLElement>('input');
      field?.focus();
    });
  }
}
