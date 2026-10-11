import { inject, Component, input, signal } from '@angular/core';
import { I18n } from './i18n/i18n';

/**
 * Inline "add a missing option" control for the select fields of a form
 */
@Component({
  selector: 'app-quick-add',
  template: `
    @if (isOpen()) {
      <div class="quick-add">
        <input
          #nameInput
          [value]="name()"
          (input)="name.set(nameInput.value)"
          (keydown.enter)="$event.preventDefault(); add()"
          (keydown.escape)="$event.stopPropagation(); close()"
          [placeholder]="placeholder()"
          [attr.aria-label]="label()"
        />
        <button
          type="button"
          class="add"
          (click)="add()"
          [disabled]="!name().trim() || isSaving()"
        >
          {{ isSaving() ? t().adding : t().add }}
        </button>
        <button type="button" class="cancel" (click)="close()">
          {{ t().cancel }}
        </button>
      </div>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    } @else {
      <button type="button" class="open" (click)="isOpen.set(true)">
        {{ label() }}
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      button {
        border: none;
        background: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.85rem;
      }

      .open {
        padding: 4px 0;
        font-weight: 600;
        color: var(--primary);
      }

      .quick-add {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      input {
        flex: 1;
        min-width: 0;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
      }

      input:focus {
        border-color: var(--primary);
      }

      .add {
        padding: 8px 12px;
        border-radius: 8px;
        background: var(--primary);
        color: var(--on-primary);
      }

      .add:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .cancel {
        color: var(--text-muted);
      }

      .error {
        margin: 4px 0 0;
        color: var(--danger);
        font-size: 0.85rem;
      }
    `,
  ],
})
export class QuickAddComponent {
  protected readonly t = inject(I18n).t;
  /** What gets added, e.g. "food item" */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  /** Creates the option; the form selects it afterwards */
  readonly create = input.required<(name: string) => Promise<void>>();

  protected readonly isOpen = signal(false);
  protected readonly name = signal('');
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected close(): void {
    this.isOpen.set(false);
    this.name.set('');
    this.error.set(null);
  }

  protected async add(): Promise<void> {
    const name = this.name().trim();
    if (!name || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.create()(name);
      this.close();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().addingFailed,
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
