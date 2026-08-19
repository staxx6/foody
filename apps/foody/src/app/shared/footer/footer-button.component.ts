import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-footer-button',
  template: `
    <button [class.active]="active()" (click)="onClick()">
      {{ label() }}
    </button>
  `,
  styles: [
    `
      button {
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        // padding: 6px 4px;

        transition:
          color 150ms,
          background-color 150ms;
      }

      button:hover {
        color: #333;
      }

      button.active {
        color: #4caf50;
        background: #e8f5e9;
        font-weight: 600;
      }
    `,
  ],
})
export class FooterButtonComponent {
  readonly label = input.required();
  readonly active = input.required();

  readonly clicked = output<void>();

  protected onClick(): void {
    this.clicked.emit();
  }
}
