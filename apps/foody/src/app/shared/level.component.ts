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

/**
 * The color of a step: the color of the discomfort (see the global styles),
 * the stronger the higher the step, like the scale of the month view
 */
export function levelColor(step: number): string {
  const strength = 10 + step * 6;
  return `color-mix(in srgb, var(--discomfort) ${strength}%, transparent)`;
}

/**
 * Shows a discomfort level, e.g. "6/10"
 */
@Component({
  selector: 'app-level-chip',
  template: `{{ step() }}/10`,
  host: {
    class: 'chip',
    '[style.background]': 'color()',
    '[style.color]': "'var(--text)'",
  },
})
export class LevelChipComponent {
  /** The level as it is stored (1-100) */
  readonly level = input.required<number>();

  protected readonly step = computed(() => levelStep(this.level()));
  protected readonly color = computed(() => levelColor(this.step()));
}

/**
 * Chooses a discomfort level in ten steps. Choosing the chosen step again
 * removes the level, as it is optional. With `withZero`, a step 0 before them
 * says that there is no discomfort (any more), as the value 0.
 */
@Component({
  selector: 'app-level-picker',
  template: `
    <div
      class="steps"
      role="radiogroup"
      [attr.aria-labelledby]="labelledBy()"
      [style.grid-template-columns]="'repeat(' + steps().length + ', 1fr)'"
    >
      @for (step of steps(); track step) {
        <button
          type="button"
          role="radio"
          [class.active]="step === selected()"
          [style.background]="
            step === selected() && step > 0 ? colorOf(step) : null
          "
          [attr.aria-checked]="step === selected()"
          [attr.tabindex]="step === (selected() ?? lowest()) ? 0 : -1"
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

      /* Filled with the color of its step, see levelColor */
      button.active {
        border-color: var(--discomfort);
        color: var(--text);
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
  /** Offers a step 0 for no discomfort, e.g. a symptom that is gone */
  readonly withZero = input(false);

  protected readonly steps = computed(() =>
    Array.from({ length: LEVEL_STEPS + 1 }, (_, index) => index).filter(
      (step) => step > 0 || this.withZero(),
    ),
  );
  protected readonly selected = computed(() => {
    const value = this.value();
    if (value === 0 && this.withZero()) return 0;
    return value ? levelStep(value) : null;
  });
  protected readonly lowest = computed(() => (this.withZero() ? 0 : 1));
  protected readonly colorOf = levelColor;

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
          ? Math.max((current ?? 2) - 1, this.lowest())
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
      .querySelector<HTMLElement>(`[data-step="${step ?? this.lowest()}"]`)
      ?.focus();
  }
}
