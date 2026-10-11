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
  | 'view-food'
  | 'view-dish'
  | 'view-symptom'
  | 'view-medication'
  | 'month'
  | 'report'
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
  private returnTo: { form: ActiveSite; id: string | null } = {
    form: 'today',
    id: null,
  };

  showForm(form: ActiveSite): void {
    this.open(form, null);
  }

  /**
   * Opens the form or the details of a record; closing it leads back to
   * the current page
   */
  edit(form: ActiveSite, id: string): void {
    this.open(form, id, { form: this.activeForm(), id: this.editId() });
  }

  /** Leaves a form */
  close(): void {
    this.open(this.returnTo.form, this.returnTo.id);
  }

  /** Shows what was logged on a day */
  showDay(day: Date): void {
    this.selectedDay.set(startOfDay(day));
    this.open('today', null);
  }

  /** Shows today */
  goHome(): void {
    this.showDay(new Date());
  }

  isActive(activeForm: ActiveSite): boolean {
    return this.activeForm() === activeForm;
  }

  private open(
    form: ActiveSite,
    id: string | null,
    returnTo: { form: ActiveSite; id: string | null } = {
      form: 'today',
      id: null,
    },
  ) {
    this.returnTo = returnTo;
    this.editId.set(id);
    this.activeForm.set(form);
    this.pageKey.update((key) => key + 1);
  }
}
