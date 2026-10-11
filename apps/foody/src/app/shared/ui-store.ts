import { computed, Injectable, signal } from '@angular/core';
import { startOfDay } from './date-utils';

export type ActiveSite =
  | 'today'
  | 'new-food-item'
  | 'new-dish'
  | 'new-meal'
  | 'new-health-entry'
  | 'new-symptom'
  | 'new-medication'
  | 'new-medication-entry'
  | 'edit-unit'
  | 'month'
  | 'settings'
  | 'lists';

@Injectable({ providedIn: 'root' })
export class UiStore {
  readonly activeForm = signal<ActiveSite>('today');
  /** The record the active form changes; null if it creates a new one */
  readonly editId = signal<string | null>(null);
  /** The day the day view shows and new entries are logged for */
  readonly selectedDay = signal(startOfDay(new Date()));
  /** Counts the pages that were opened */
  private readonly pageKey = signal(0);

  /**
   * The page that is shown. Its key changes whenever a page is opened, so a
   * form always starts fresh, even if the same form was open before.
   */
  readonly page = computed(() => ({
    key: this.pageKey(),
    form: this.activeForm(),
    editId: this.editId(),
  }));

  /** Where closing the form leads back to */
  private returnTo: ActiveSite = 'today';

  showForm(form: ActiveSite): void {
    this.open(form, null, 'today');
  }

  /** Opens the form of a record; closing it leads back to the current page */
  edit(form: ActiveSite, id: string): void {
    this.open(form, id, this.activeForm());
  }

  /** Leaves a form */
  close(): void {
    this.open(this.returnTo, null, 'today');
  }

  /** Shows what was logged on a day */
  showDay(day: Date): void {
    this.selectedDay.set(startOfDay(day));
    this.open('today', null, 'today');
  }

  /** Shows today */
  goHome(): void {
    this.showDay(new Date());
  }

  isActive(activeForm: ActiveSite): boolean {
    return this.activeForm() === activeForm;
  }

  private open(form: ActiveSite, id: string | null, returnTo: ActiveSite) {
    this.returnTo = returnTo;
    this.editId.set(id);
    this.activeForm.set(form);
    this.pageKey.update((key) => key + 1);
  }
}
