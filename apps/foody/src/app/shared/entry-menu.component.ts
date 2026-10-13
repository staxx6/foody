import {
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
} from '@angular/core';
import { I18n } from './i18n/i18n';
import { Translations } from './i18n/translations';
import { IconComponent, IconName } from './icon.component';
import { Keyboard } from './keyboard/keyboard';

export type MenuAction = {
  label: string;
  icon: IconName;
  /** The key that runs the action, as in `KeyboardEvent.key` */
  key?: string;
  /** How the key is shown, if it differs from the key itself */
  keyLabel?: string;
  danger?: boolean;
  run: () => void;
};

/**
 * The actions every entry has: edit, log it once more, show what it is an
 * entry of (unless that was deleted) and delete
 */
export function entryActions(
  t: Translations,
  run: {
    edit: () => void;
    copy?: () => void;
    details: (() => void) | null;
    remove: () => void;
  },
): MenuAction[] {
  const { copy, details } = run;
  return [
    { label: t.edit, icon: 'edit', key: 'e', keyLabel: 'E', run: run.edit },
    ...(copy
      ? [
          {
            label: t.logAgain,
            icon: 'copy' as const,
            key: 'd',
            keyLabel: 'D',
            run: copy,
          },
        ]
      : []),
    ...(details
      ? [{ label: t.showDetails, icon: 'info' as const, run: details }]
      : []),
    {
      label: t.delete,
      icon: 'trash',
      key: 'Delete',
      keyLabel: t.keyDelete,
      danger: true,
      run: run.remove,
    },
  ];
}

/** The space between the menu and what it belongs to */
const GAP = 4;

/**
 * What can be done with an entry of a list, as a menu that opens at the
 * entry. It is opened by its button with the three dots or by the row it is
 * in (see row.directive).
 */
@Component({
  selector: 'app-entry-menu',
  imports: [IconComponent],
  host: { '(document:click)': 'closeOnClickOutside($event)' },
  template: `
    <button
      type="button"
      class="icon-btn"
      aria-haspopup="menu"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-label]="t().actionsFor(label())"
      [title]="t().actions"
      (click)="toggle()"
    >
      <app-icon name="more" />
    </button>
    @if (isOpen()) {
      <ul
        role="menu"
        [attr.aria-label]="t().actionsFor(label())"
        [style.top.px]="position().top"
        [style.right.px]="position().right"
      >
        @for (action of actions(); track action.label) {
          <li role="none">
            <button
              type="button"
              role="menuitem"
              [class.danger]="action.danger"
              (click)="run(action)"
            >
              <app-icon [name]="action.icon" />
              <span>{{ action.label }}</span>
              @if (action.key) {
                <kbd class="kbd">{{ action.keyLabel ?? action.key }}</kbd>
              }
            </button>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      :host {
        flex: none;
        display: flex;
      }

      .icon-btn {
        margin: -6px -8px -6px 0;
      }

      /* Fixed to the screen, so the card of the list does not cut it off */
      ul {
        position: fixed;
        z-index: 30;
        min-width: 200px;
        padding: 4px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      }

      li button {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 12px;
        border: none;
        border-radius: 8px;
        background: none;
        color: var(--text);
        font-size: 0.95rem;
        text-align: left;
        cursor: pointer;
      }

      li button:hover,
      li button:focus-visible {
        background: var(--primary-soft);
        outline: none;
      }

      li button.danger {
        color: var(--danger);
      }

      li button.danger:hover,
      li button.danger:focus-visible {
        background: var(--danger-soft);
      }

      li app-icon {
        color: var(--text-muted);
      }

      li .danger app-icon {
        color: inherit;
      }

      li span {
        flex: 1;
      }
    `,
  ],
})
export class EntryMenuComponent implements OnDestroy {
  protected readonly t = inject(I18n).t;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly actions = input.required<MenuAction[]>();
  /** What the entry is called, for screen readers */
  readonly label = input.required<string>();

  protected readonly isOpen = signal(false);
  protected readonly position = signal({ top: 0, right: 0 });

  // Scrolling would move the entry away from under its menu
  private readonly closeOnScroll = () => this.close();

  constructor() {
    const runByKey = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const action = this.actions().find((other) => other.key === key);
      if (action) this.run(action);
    };

    // While the menu is open, the keys are for the menu only
    inject(Keyboard).bind(
      {
        Escape: () => this.close(true),
        ArrowDown: () => this.move(1),
        ArrowUp: () => this.move(-1),
        e: runByKey,
        f: runByKey,
        d: runByKey,
        ' ': runByKey,
        Delete: runByKey,
      },
      { when: () => this.isOpen(), exclusive: true },
    );
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.closeOnScroll, true);
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open(): void {
    const anchor = this.anchor().getBoundingClientRect();
    this.position.set({
      top: anchor.bottom + GAP,
      right: Math.max(window.innerWidth - anchor.right, GAP),
    });
    this.isOpen.set(true);
    document.addEventListener('scroll', this.closeOnScroll, true);

    // After the menu has been rendered
    setTimeout(() => {
      const menu = this.host.nativeElement.querySelector('ul');
      if (!menu) return;
      // Without room below, the menu opens above
      if (menu.getBoundingClientRect().bottom > window.innerHeight) {
        this.position.update((position) => ({
          ...position,
          top: Math.max(anchor.top - menu.offsetHeight - GAP, GAP),
        }));
      }
      this.move(1);
    });
  }

  /** @param refocus gives the focus back to the row, to go on by keyboard */
  close(refocus = false): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    document.removeEventListener('scroll', this.closeOnScroll, true);
    if (refocus) this.row()?.focus();
  }

  protected run(action: MenuAction): void {
    this.close(true);
    action.run();
  }

  /** A click on the own row is handled by the row and the button */
  protected closeOnClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // A row within the own row, e.g. a follow-up, is another row
    const isOwn =
      this.host.nativeElement.contains(target) ||
      (!!this.row() && target.closest('[data-row]') === this.row());
    if (!isOwn) this.close();
  }

  /** Moves the focus to the next or previous action */
  private move(step: number): void {
    const items = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('[role=menuitem]'),
    );
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      current < 0 ? 0 : (current + step + items.length) % items.length;
    items[next]?.focus();
  }

  private row(): HTMLElement | null {
    return this.host.nativeElement.closest<HTMLElement>('[data-row]');
  }

  /** The button, which the menu opens below */
  private anchor(): HTMLElement {
    return (
      this.host.nativeElement.querySelector<HTMLElement>('.icon-btn') ??
      this.host.nativeElement
    );
  }
}
