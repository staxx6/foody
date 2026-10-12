import {
  Component,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { I18n } from '../i18n/i18n';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <!-- Closing with Escape or the back gesture counts as "no" -->
    <dialog #dialog (close)="confirm.answer(false)">
      @if (confirm.request(); as request) {
        <h2>{{ request.title }}</h2>
        <p>{{ request.message }}</p>
        <div class="actions">
          @if (request.confirmLabel) {
            <button type="button" (click)="confirm.answer(false)">
              {{ request.cancelLabel ?? t().cancel }}
            </button>
            <button type="button" class="danger" (click)="confirm.answer(true)">
              {{ request.confirmLabel }}
            </button>
          } @else {
            <button type="button" (click)="confirm.answer(false)">
              {{ t().ok }}
            </button>
          }
        </div>
      }
    </dialog>
  `,
  styles: [
    `
      dialog {
        width: min(360px, calc(100vw - 32px));
        padding: 20px;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
        color: var(--text);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
      }

      dialog::backdrop {
        background: rgba(0, 0, 0, 0.45);
      }

      h2 {
        margin: 0 0 8px;
        font-size: 1.1rem;
      }

      p {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.95rem;
        overflow-wrap: anywhere;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 20px;
      }

      button {
        min-height: 44px;
        padding: 0 18px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
      }

      .danger {
        border-color: var(--danger);
        background: var(--danger);
        color: var(--surface);
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  protected readonly t = inject(I18n).t;

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.confirm.request() && !dialog.open) dialog.showModal();
      if (!this.confirm.request() && dialog.open) dialog.close();
    });
  }
}
