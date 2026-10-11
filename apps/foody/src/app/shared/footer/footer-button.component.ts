import {
  inject,
  booleanAttribute,
  Component,
  input,
  output,
} from '@angular/core';
import { I18n } from '../i18n/i18n';
import { IconComponent, IconName } from '../icon.component';

@Component({
  selector: 'app-footer-button',
  imports: [IconComponent],
  template: `
    <button
      [class.active]="active()"
      [disabled]="disabled()"
      [title]="disabled() ? t().comingSoon : ''"
      (click)="onClick()"
    >
      <app-icon class="icon" [name]="icon()" />
      {{ label() }}
    </button>
  `,
  styles: [
    `
      button {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        width: 100%;
        padding: 6px 4px;
        border: none;
        border-radius: 12px;
        background: none;
        color: var(--text-muted);
        font-size: 0.7rem;
        font-weight: 600;
        cursor: pointer;
      }

      .icon {
        font-size: 1.25rem;
      }

      button:hover:not(:disabled) {
        color: var(--text);
      }

      button.active {
        color: var(--primary);
        background: var(--primary-soft);
      }

      button:disabled {
        opacity: 0.4;
        cursor: default;
      }

      /* In the sidebar of wide screens: icon and label side by side */
      @media (min-width: 1024px) {
        button {
          flex-direction: row;
          justify-content: flex-start;
          gap: 12px;
          padding: 11px 12px;
          font-size: 0.95rem;
        }
      }
    `,
  ],
})
export class FooterButtonComponent {
  protected readonly t = inject(I18n).t;
  readonly label = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly active = input.required<boolean>();
  /** For pages that do not exist yet */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly clicked = output<void>();

  protected onClick(): void {
    this.clicked.emit();
  }
}
