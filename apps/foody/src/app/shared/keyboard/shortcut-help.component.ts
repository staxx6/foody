import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { I18n } from '../i18n/i18n';
import { IconComponent } from '../icon.component';
import { Keyboard } from './keyboard';

type Shortcut = {
  keys: string[];
  /** The keys are pressed one after the other instead of being alternatives */
  sequence?: boolean;
  label: string;
};

/**
 * The window that lists all keyboard shortcuts, opened with "?"
 */
@Component({
  selector: 'app-shortcut-help',
  imports: [IconComponent],
  host: { '(click)': 'closeOnBackdrop($event)' },
  template: `
    <dialog #dialog (close)="keyboard.isHelpOpen.set(false)">
      @if (keyboard.isHelpOpen()) {
        <header>
          <h2>{{ t().keyboardShortcuts }}</h2>
          <button
            type="button"
            class="icon-btn"
            (click)="keyboard.isHelpOpen.set(false)"
            [attr.aria-label]="t().close"
          >
            <app-icon name="close" />
          </button>
        </header>
        <div class="groups">
          @for (group of groups(); track group.title) {
            <section>
              <h3>{{ group.title }}</h3>
              <dl>
                @for (shortcut of group.shortcuts; track shortcut.label) {
                  <div>
                    <dt>
                      @for (key of shortcut.keys; track key) {
                        @if (shortcut.sequence && !$first) {
                          <span>{{ t().then }}</span>
                        }
                        <kbd class="kbd">{{ key }}</kbd>
                      }
                    </dt>
                    <dd>{{ shortcut.label }}</dd>
                  </div>
                }
              </dl>
            </section>
          }
        </div>
      }
    </dialog>
  `,
  styles: [
    `
      dialog {
        width: min(860px, calc(100vw - 32px));
        max-height: calc(100dvh - 48px);
        padding: 24px;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
        color: var(--text);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
        /* The window itself gets the focus when it opens */
        outline: none;
      }

      dialog::backdrop {
        background: rgba(0, 0, 0, 0.45);
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }

      h2 {
        margin: 0;
        font-size: 1.25rem;
      }

      .icon-btn {
        margin: 0;
      }

      .groups {
        columns: 2 320px;
        column-gap: 32px;
      }

      section {
        break-inside: avoid;
        margin-bottom: 20px;
      }

      h3 {
        margin: 0 0 8px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      dl {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0;
      }

      dl div {
        display: flex;
        align-items: baseline;
        gap: 12px;
        font-size: 0.9rem;
      }

      dt {
        flex: none;
        display: flex;
        align-items: center;
        gap: 4px;
        width: 7.5rem;
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      dd {
        margin: 0;
      }

      /* The window is about the keys, so they are shown on any screen */
      .kbd {
        display: inline-block;
      }
    `,
  ],
})
export class ShortcutHelpComponent {
  protected readonly keyboard = inject(Keyboard);
  protected readonly t = inject(I18n).t;

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly groups = computed<
    { title: string; shortcuts: Shortcut[] }[]
  >(() => {
    const t = this.t();
    const keys = t.shortcuts;
    const rows: Shortcut[] = [
      { keys: ['↑', '↓'], label: keys.selectEntry },
      { keys: ['E'], label: t.edit },
      { keys: [t.keyDelete], label: t.delete },
    ];
    const create = (key: string, label: string): Shortcut => ({
      keys: ['N', key],
      sequence: true,
      label,
    });

    return [
      {
        title: keys.general,
        shortcuts: [
          { keys: ['?'], label: keys.help },
          { keys: ['1', '2', '3', '4', '5'], label: keys.pages },
          { keys: ['Esc'], label: keys.escape },
          { keys: [`${t.keyCtrl} + Z`], label: keys.undo },
        ],
      },
      {
        title: t.addEntry,
        shortcuts: [
          { keys: ['N'], label: keys.addMenu },
          { keys: ['M'], label: t.logMeal },
          { keys: ['S'], label: t.logSymptom },
          { keys: ['P'], label: t.logMedication },
          { keys: ['W'], label: t.writeNote },
          create('F', t.newFood),
          create('D', t.newDish),
          create('Y', t.newSymptom),
          create('K', t.newMedication),
        ],
      },
      {
        title: t.today,
        shortcuts: [
          { keys: ['←', '→'], label: keys.changeDay },
          { keys: ['T'], label: t.backToToday },
          ...rows,
          { keys: ['Enter'], label: keys.openMenu },
          { keys: ['D'], label: t.logAgain },
          { keys: [t.keySpace], label: keys.selectMeals },
          { keys: ['F'], label: keys.followUp },
        ],
      },
      {
        title: t.month,
        shortcuts: [
          { keys: ['←', '→'], label: keys.changeMonth },
          { keys: ['T'], label: t.backToCurrentMonth },
          { keys: ['↑', '↓'], label: keys.calendar },
          { keys: ['Enter'], label: keys.openDay },
        ],
      },
      {
        title: t.lists,
        shortcuts: [
          { keys: ['/'], label: keys.search },
          ...rows,
          { keys: ['Enter'], label: keys.openMenu },
        ],
      },
      {
        title: t.report,
        shortcuts: [{ keys: ['X'], label: t.exportExcel }],
      },
      {
        title: keys.forms,
        shortcuts: [
          { keys: [`${t.keyCtrl} + Enter`], label: t.save },
          { keys: ['Esc'], label: keys.cancelForm },
          { keys: ['↑', '↓', 'Enter'], label: keys.pickOption },
          { keys: ['1', '…', '0'], label: keys.level },
        ],
      },
    ];
  });

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.keyboard.isHelpOpen() && !dialog.open) dialog.showModal();
      if (!this.keyboard.isHelpOpen() && dialog.open) dialog.close();
    });
  }

  /** A click next to the window closes it */
  protected closeOnBackdrop(event: MouseEvent): void {
    const dialog = this.dialog().nativeElement;
    // The backdrop is part of the dialog, so the position tells them apart
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    const isInside =
      event.clientX >= left &&
      event.clientX <= right &&
      event.clientY >= top &&
      event.clientY <= bottom;
    if (event.target === dialog && !isInside) {
      this.keyboard.isHelpOpen.set(false);
    }
  }
}
