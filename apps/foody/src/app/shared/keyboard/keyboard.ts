import {
  DestroyRef,
  ElementRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';

/**
 * What the keys do. A key is named as in `KeyboardEvent.key`, letters in
 * lower case; `ctrl+enter` and `ctrl+z` stand for the key with Ctrl or Cmd. A handler that
 * returns false did nothing, so the browser handles the key.
 */
export type KeyBindings = Record<
  string,
  (event: KeyboardEvent) => void | boolean
>;

type Layer = {
  /** The component that bound the keys */
  host: HTMLElement | undefined;
  bindings: KeyBindings;
  when: () => boolean;
  exclusive: boolean;
};

const FIELDS = 'input, textarea, select, [contenteditable]';

/** Whether the user is typing into the element */
export function isField(element: EventTarget | null): boolean {
  return element instanceof HTMLElement && element.matches(FIELDS);
}

/** Whether the layout of wide screens is shown, see the styles */
export function isWideScreen(): boolean {
  return window.matchMedia('(min-width: 1024px)').matches;
}

/**
 * The keyboard shortcuts of the app. Components bind the keys that make
 * sense while they are shown.
 */
@Injectable({ providedIn: 'root' })
export class Keyboard {
  /** The window that lists all shortcuts */
  readonly isHelpOpen = signal(false);

  private layers: Layer[] = [];

  constructor() {
    document.addEventListener('keydown', (event) => this.onKey(event));
  }

  /**
   * Binds keys for as long as the calling component exists.
   * @param options.when the keys only work while it returns true
   * @param options.exclusive while active, no other keys work, e.g. for a menu
   */
  bind(
    bindings: KeyBindings,
    options: { when?: () => boolean; exclusive?: boolean } = {},
  ): void {
    const layer: Layer = {
      host: inject(ElementRef, { optional: true })?.nativeElement,
      bindings,
      when: options.when ?? (() => true),
      exclusive: options.exclusive ?? false,
    };
    this.layers.push(layer);
    inject(DestroyRef).onDestroy(
      () => (this.layers = this.layers.filter((other) => other !== layer)),
    );
  }

  private onKey(event: KeyboardEvent): void {
    // Handled by the element itself, e.g. a row or the calendar
    if (event.defaultPrevented || event.isComposing) return;
    // A dialog has the keys for itself
    if (document.querySelector('dialog[open]')) return;

    const key = this.keyOf(event);
    if (!key) return;
    // Typing is not a shortcut
    if (isField(event.target) && key !== 'Escape' && key !== 'ctrl+enter') {
      return;
    }

    // A form at the side has the keys; the page behind it does not react
    const panel = document.querySelector('.side-panel');
    const active = this.layers.filter(
      (layer) =>
        layer.when() &&
        !(panel && layer.host?.closest('main') && !panel.contains(layer.host)),
    );
    const exclusive = active.filter((layer) => layer.exclusive);
    // The keys bound last win, as they belong to what was opened last
    const handler = (exclusive.length > 0 ? exclusive : active)
      .map((layer) => layer.bindings[key])
      .filter((binding) => !!binding)
      .pop();

    if (handler && handler(event) !== false) event.preventDefault();
  }

  private keyOf(event: KeyboardEvent): string | null {
    if (event.altKey) return null;
    if (event.ctrlKey || event.metaKey) {
      // The other combinations belong to the browser
      if (event.key === 'Enter') return 'ctrl+enter';
      return event.key.toLowerCase() === 'z' && !event.shiftKey
        ? 'ctrl+z'
        : null;
    }
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }
}
