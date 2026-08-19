import { Injectable, signal } from '@angular/core';

export type ActiveSite =
  | 'today'
  | 'new-food-item'
  | 'new-dish'
  | 'new-meal'
  | 'new-health-entry'
  | 'new-symptom';

@Injectable({ providedIn: 'root' })
export class UiStore {
  readonly activeForm = signal<ActiveSite>('today');

  showForm(form: ActiveSite): void {
    this.activeForm.set(form);
  }

  goHome(): void {
    this.activeForm.set('today');
  }

	isActive(activeForm: ActiveSite): boolean {
		return this.activeForm() === activeForm;
	}
}
