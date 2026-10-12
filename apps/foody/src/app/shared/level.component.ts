import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

/** The discomfort is entered and shown in this many steps */
export const LEVEL_STEPS = 10;
/** A level is stored as 1-100, so a step is worth that much */
const STEP_SIZE = 100 / LEVEL_STEPS;

/** The step (1-10) of a discomfort level as it is stored (1-100) */
export function levelStep(level: number): number {
  return Math.min(LEVEL_STEPS, Math.max(1, Math.round(level / STEP_SIZE)));
}

/** How bad a step is, which decides its color */
function severity(step: number): 'low' | 'medium' | 'high' {
  return step <= 3 ? 'low' : step <= 6 ? 'medium' : 'high';
}

/**
 * Shows a discomfort level, e.g. "6/10"
 */
@Component({
  selector: 'app-level-chip',
  template: `{{ step() }}/10`,
  host: {
    class: 'chip',
    '[class.medium]': "severity() === 'medium'",
    '[class.high]': "severity() === 'high'",
  },
})
export class LevelChipComponent {
  /** The level as it is stored (1-100) */
  readonly level = input.required<number>();

  protected readonly step = computed(() => levelStep(this.level()));
  protected readonly severity = computed(() => severity(this.step()));
}

/**
 * Chooses a discomfort level in ten steps. Choosing the chosen step again
 * removes the level, as it is optional.
 */
@Component({
  selector: 'app-level-picker',
  template: `
    <div class="steps" role="radiogroup" [attr.aria-labelledby]="labelledBy()">
      @for (step of steps; track step) {
        <button
          type="button"
          role="radio"
          [class]="severityOf(step)"
          [class.active]="step === selected()"
          [attr.aria-checked]="step === selected()"
          [attr.tabindex]="step === (selected() ?? 1) ? 0 : -1"
          [attr.data-step]="step"
          (click)="choose(step === selected() ? null : step)"
          (keydown)="onKey($event)"
        >
          {{ step }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .steps {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 4px;
      }

      button {
        min-width: 0;
        min-height: 44px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 10px;
        background: var(--field);
        color: var(--text-muted);
        font-size: 0.95rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
      }

      button:hover {
        border-color: var(--border);
        color: var(--text);
      }

      /* The colors of the chips that show a level */
      button.active {
        border-color: var(--primary);
        background: var(--primary-soft);
        color: var(--primary);
      }

      button.active.medium {
        border-color: var(--warning);
        background: var(--warning-soft);
        color: var(--warning);
      }

      button.active.high {
        border-color: var(--danger);
        background: var(--danger-soft);
        color: var(--danger);
      }
    `,
  ],
})
export class LevelPickerComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The level as it is stored (1-100), null if none is chosen */
  readonly value = model<number | null>(null);
  /** The id of the element that names the field */
  readonly labelledBy = input<string>();

  protected readonly steps = Array.from(
    { length: LEVEL_STEPS },
    (_, index) => index + 1,
  );
  protected readonly selected = computed(() => {
    const value = this.value();
    return value ? levelStep(value) : null;
  });
  protected readonly severityOf = severity;

  protected choose(step: number | null): void {
    this.value.set(step === null ? null : step * STEP_SIZE);
    // Like a field of the browser, so a form notices that it has input
    this.host.nativeElement.dispatchEvent(
      new Event('change', { bubbles: true }),
    );
  }

  /** Arrow keys and digits choose a step, Backspace and Delete none */
  protected onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const current = this.selected();
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? Math.min((current ?? 0) + 1, LEVEL_STEPS)
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? Math.max((current ?? 2) - 1, 1)
          : event.key === 'Backspace' || event.key === 'Delete'
            ? null
            : /^\d$/.test(event.key)
              ? // 0 stands for the highest step, as there is no key for 10
                Number(event.key) || LEVEL_STEPS
              : undefined;
    if (step === undefined) return;

    event.preventDefault();
    this.choose(step);
    this.host.nativeElement
      .querySelector<HTMLElement>(`[data-step="${step ?? 1}"]`)
      ?.focus();
  }
}
