import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { I18n } from '../i18n/i18n';
import { IconComponent } from '../icon.component';
import { fuzzyFilter } from './fuzzy';

export type SelectOption = { id: string; name: string };

let nextId = 0;

/**
 * Select field with a search: typing filters the options, tolerant of
 * typos. Takes the place of a `<select>` with many options.
 */
@Component({
  selector: 'app-search-select',
  imports: [IconComponent],
  template: `
    <input
      #field
      type="text"
      role="combobox"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      [id]="inputId()"
      [value]="text()"
      [placeholder]="placeholder()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-controls]="listId"
      aria-autocomplete="list"
      (focus)="open(); field.select()"
      (click)="open()"
      (input)="search(field.value)"
      (keydown)="onKey($event)"
    />
    @if (value()) {
      <button
        type="button"
        class="clear"
        (click)="clear()"
        [attr.aria-label]="t().clearSelection"
      >
        <app-icon name="close" />
      </button>
    } @else {
      <app-icon class="hint" name="search" />
    }

    @if (isOpen()) {
      <!-- mousedown would take the focus from the field and close the list -->
      <ul role="listbox" [id]="listId" (mousedown)="$event.preventDefault()">
        @for (option of matches(); track option.id) {
          <li
            role="option"
            [class.active]="$index === activeIndex()"
            [class.selected]="option.id === value()"
            [attr.aria-selected]="option.id === value()"
            tabindex="-1"
            (click)="select(option)"
            (keydown.enter)="select(option)"
          >
            {{ option.name }}
          </li>
        } @empty {
          <li class="none">{{ t().noMatches }}</li>
        }
      </ul>
    }
  `,
  host: { '(focusout)': 'onFocusOut($event)' },
  styles: [
    `
      :host {
        position: relative;
        display: block;
        min-width: 0;
      }

      input {
        padding-right: 40px;
        text-overflow: ellipsis;
      }

      .clear,
      .hint {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 44px;
        color: var(--text-muted);
      }

      .hint {
        top: 13px;
        right: 12px;
        width: 18px;
        height: 18px;
        pointer-events: none;
      }

      .clear {
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
      }

      ul {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 5;
        min-width: 100%;
        max-height: 240px;
        overflow-y: auto;
        padding: 4px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      }

      li {
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        white-space: nowrap;
      }

      li.selected {
        color: var(--primary);
        font-weight: 600;
      }

      li.active {
        background: var(--primary-soft);
      }

      li.none {
        color: var(--text-muted);
        cursor: default;
      }
    `,
  ],
})
export class SearchSelectComponent {
  protected readonly t = inject(I18n).t;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly field =
    viewChild.required<ElementRef<HTMLInputElement>>('field');

  readonly options = input.required<SelectOption[]>();
  /** The id of the selected option, empty if none */
  readonly value = model('');
  readonly placeholder = input('');
  readonly ariaLabel = input('');
  /** To connect a `<label for>` */
  readonly inputId = input<string>();

  /** Connects the field with its list for screen readers */
  protected readonly listId = `search-select-${nextId++}`;

  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(0);
  /** What the user typed since opening; null while not searching */
  private readonly query = signal<string | null>(null);

  protected readonly text = computed(
    () =>
      this.query() ??
      this.options().find((option) => option.id === this.value())?.name ??
      '',
  );
  protected readonly matches = computed(() =>
    fuzzyFilter(this.options(), this.query() ?? ''),
  );

  protected open(): void {
    if (this.isOpen()) return;
    this.isOpen.set(true);
    this.activeIndex.set(
      Math.max(
        0,
        this.matches().findIndex((option) => option.id === this.value()),
      ),
    );
  }

  /** Closes the list; text that was typed without selecting is discarded */
  private close(): void {
    this.isOpen.set(false);
    this.query.set(null);
  }

  protected search(query: string): void {
    this.query.set(query);
    this.isOpen.set(true);
    this.activeIndex.set(0);
  }

  protected select(option: SelectOption): void {
    this.value.set(option.id);
    this.close();
  }

  protected clear(): void {
    this.value.set('');
    this.query.set(null);
    this.field().nativeElement.focus();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.nativeElement.contains(next)) this.close();
  }

  protected onKey(event: KeyboardEvent): void {
    const matches = this.matches();

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.isOpen()) return this.open();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const count = Math.max(matches.length, 1);
        this.activeIndex.update((index) => (index + step + count) % count);
        this.scrollToActive();
        break;
      }
      case 'Enter': {
        if (!this.isOpen()) return;
        // Selects the option instead of submitting the form
        event.preventDefault();
        const option = matches[this.activeIndex()];
        if (option) this.select(option);
        break;
      }
      case 'Escape':
        if (this.isOpen()) {
          event.stopPropagation();
          this.close();
        }
        break;
    }
  }

  private scrollToActive(): void {
    // After the list has been updated
    setTimeout(() =>
      this.host.nativeElement
        .querySelector('li.active')
        ?.scrollIntoView({ block: 'nearest' }),
    );
  }
}
