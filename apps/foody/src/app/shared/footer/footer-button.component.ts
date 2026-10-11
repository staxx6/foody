import { booleanAttribute, Component, input, output } from '@angular/core';
import { IconComponent, IconName } from '../icon.component';

@Component({
  selector: 'app-footer-button',
  imports: [IconComponent],
  template: `
    <button
      [class.active]="active()"
      [disabled]="disabled()"
      [title]="disabled() ? 'Coming soon' : ''"
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
        transition:
          color 150ms,
          background-color 150ms;
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
    `,
  ],
})
export class FooterButtonComponent {
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
