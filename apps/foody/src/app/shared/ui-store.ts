import { Injectable, signal } from '@angular/core';

export type ActiveForm =
  | 'home'
  | 'new-food-item'
  | 'new-dish'
  | 'new-meal'
  | 'new-health-entry'
  | 'new-symptom';

@Injectable({ providedIn: 'root' })
export class UiStore {
  readonly activeForm = signal<ActiveForm>('home');

  showForm(form: ActiveForm): void {
    this.activeForm.set(form);
  }

  goHome(): void {
    this.activeForm.set('home');
  }
}
