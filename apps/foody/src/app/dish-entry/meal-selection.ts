import { computed, Injectable, signal } from '@angular/core';

/**
 * The meals of the day view that are selected, to log several of them again
 * in one go: a breakfast is often nearly the same as the one before, but not
 * enough to be a dish
 */
@Injectable({ providedIn: 'root' })
export class MealSelection {
  /** The entries in the order they were selected */
  readonly ids = signal<string[]>([]);
  readonly count = computed(() => this.ids().length);

  has(id: string): boolean {
    return this.ids().includes(id);
  }

  toggle(id: string): void {
    this.ids.update((ids) =>
      ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id],
    );
  }

  clear(): void {
    if (this.count() > 0) this.ids.set([]);
  }
}
