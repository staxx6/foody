import { Component, inject } from '@angular/core';
import { I18n } from '../i18n/i18n';
import { Keyboard } from '../keyboard/keyboard';
import { ConfirmService } from './confirm.service';

/**
 * Says what was deleted and offers to undo it, for as long as that is
 * possible (see ConfirmService)
 */
@Component({
  selector: 'app-undo-toast',
  template: `
    <div class="toast" role="status">
      @if (confirm.deleted(); as deleted) {
        <span class="message">{{ t().deletedNamed(deleted.name) }}</span>
        <button type="button" (click)="confirm.undoDelete()">
          {{ t().undo }}
          <kbd class="kbd">{{ t().keyCtrl }} Z</kbd>
        </button>
      }
    </div>
  `,
  styles: [
    `
      /* Always there, so screen readers announce what appears in it */
      .toast:empty {
        display: none;
      }

      .toast {
        position: fixed;
        /* Above the navigation at the bottom */
        bottom: calc(96px + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        z-index: 40;
        display: flex;
        align-items: center;
        gap: 16px;
        width: max-content;
        max-width: calc(100vw - 32px);
        padding: 10px 10px 10px 16px;
        border-radius: var(--radius);
        background: var(--text);
        color: var(--surface);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        font-size: 0.9rem;
      }

      .message {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      button {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border: none;
        border-radius: 8px;
        background: color-mix(in srgb, var(--surface) 16%, transparent);
        color: inherit;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
      }

      button:hover {
        background: color-mix(in srgb, var(--surface) 28%, transparent);
      }

      .kbd {
        border-color: currentColor;
        background: none;
        color: inherit;
        opacity: 0.75;
      }

      /* Wide screens: in the middle of the page next to the sidebar */
      @media (min-width: 1024px) {
        .toast {
          bottom: 32px;
          left: calc(50% + 124px);
        }
      }
    `,
  ],
})
export class UndoToastComponent {
  protected readonly confirm = inject(ConfirmService);
  protected readonly t = inject(I18n).t;

  constructor() {
    inject(Keyboard).bind(
      { 'ctrl+z': () => this.confirm.undoDelete() },
      { when: () => !!this.confirm.deleted() },
    );
  }
}
