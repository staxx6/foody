import { Component, input } from '@angular/core';

export type KeyHint = { keys: string[]; label: string };

/**
 * Names the keys that work on the page. Only shown on wide screens, like
 * all hints for keys (see `.kbd` in the styles).
 */
@Component({
  selector: 'app-key-hints',
  template: `
    @for (hint of hints(); track hint.label) {
      <span>
        @for (key of hint.keys; track key) {
          <kbd class="kbd">{{ key }}</kbd>
        }
        {{ hint.label }}
      </span>
    }
  `,
  styles: [
    `
      :host {
        display: none;
      }

      @media (min-width: 1024px) {
        :host {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    `,
  ],
})
export class KeyHintsComponent {
  readonly hints = input.required<KeyHint[]>();
}
