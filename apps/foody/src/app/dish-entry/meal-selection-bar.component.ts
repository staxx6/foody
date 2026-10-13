import { Component, inject } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { Keyboard } from '../shared/keyboard/keyboard';
import { UiStore } from '../shared/ui-store';
import { MealSelection } from './meal-selection';

/**
 * Says how many meals are selected and offers to log them again, for as long
 * as there is a selection (see MealSelection)
 */
@Component({
  selector: 'app-meal-selection-bar',
  imports: [IconComponent],
  template: `
    @if (selection.count() > 0) {
      <div class="bar" role="toolbar" [attr.aria-label]="t().selection">
        <span class="count">{{ t().selectedCount(selection.count()) }}</span>
        <button type="button" class="again" (click)="logAgain()">
          <app-icon name="copy" /> {{ t().logAgain }}
          <kbd class="kbd">D</kbd>
        </button>
        <button
          type="button"
          class="clear"
          (click)="selection.clear()"
          [title]="t().clearSelection"
          [attr.aria-label]="t().clearSelection"
        >
          <app-icon name="close" /><kbd class="kbd">Esc</kbd>
        </button>
      </div>
    }
  `,
  styles: [
    `
      .bar {
        position: fixed;
        /* Above the navigation at the bottom */
        bottom: calc(96px + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        z-index: 12;
        display: flex;
        align-items: center;
        gap: 8px;
        width: max-content;
        max-width: calc(100vw - 32px);
        padding: 8px 8px 8px 18px;
        border-radius: 999px;
        background: var(--text);
        color: var(--surface);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        font-size: 0.9rem;
      }

      .count {
        margin-right: 8px;
        font-weight: 600;
        white-space: nowrap;
      }

      button {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 40px;
        padding: 6px 14px;
        border: none;
        border-radius: 999px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      .again {
        background: var(--primary);
        color: var(--on-primary, #fff);
      }

      .clear {
        background: none;
        color: inherit;
      }

      .clear:hover {
        background: color-mix(in srgb, var(--surface) 18%, transparent);
      }

      /* Wide screens have no navigation at the bottom */
      @media (min-width: 1024px) {
        .bar {
          bottom: 32px;
          /* In the middle of the room next to the sidebar */
          left: calc(50% + 124px);
        }
      }
    `,
  ],
})
export class MealSelectionBarComponent {
  protected readonly t = inject(I18n).t;
  protected readonly selection = inject(MealSelection);
  private readonly uiStore = inject(UiStore);

  constructor() {
    inject(Keyboard).bind(
      {
        Escape: () => this.selection.clear(),
        d: () => this.logAgain(),
      },
      { when: () => this.selection.count() > 0 },
    );
  }

  /** Opens the form of a meal with all that is selected, eaten now */
  protected logAgain(): void {
    this.uiStore.copy('new-meal', this.selection.ids().join(','));
  }
}
