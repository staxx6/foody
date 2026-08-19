import { Component, inject } from '@angular/core';
import { DishEntryListComponent } from '../dish-entry/dish-entry-list.component';
import { SymptomEntryListComponent } from '../symptom-entry/symptom-entry-list.component';
import { FooterNavComponent } from '../shared/footer-nav.component';
import { UiStore } from '../shared/ui-store';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { NewDishFormComponent } from '../dish/new-dish-form.component';
import { NewMealFormComponent } from '../dish-entry/new-meal-form.component';
import { NewHealthEntryFormComponent } from '../symptom-entry/new-health-entry-form.component';
import { NewSymptomFormComponent } from '../symptom-entry/new-symptom-form.component';

@Component({
  imports: [
    DishEntryListComponent,
    SymptomEntryListComponent,
    FooterNavComponent,
    NewFoodItemFormComponent,
    NewDishFormComponent,
    NewMealFormComponent,
    NewHealthEntryFormComponent,
    NewSymptomFormComponent,
  ],
  template: `
    <header>
      <h1>foody</h1>
    </header>

    <main>
      @switch (uiStore.activeForm()) {
        @case ('new-food-item') {
          <app-new-food-item-form />
        }
        @case ('new-dish') {
          <app-new-dish-form />
        }
        @case ('new-meal') {
          <app-new-meal-form />
        }
        @case ('new-health-entry') {
          <app-new-health-entry-form />
        }
        @case ('new-symptom') {
          <app-new-symptom-form />
        }
        @default {
          <section>
            <h2>Day</h2>
            <app-dish-entry-list />
          </section>

          <section>
            <h2>Health</h2>
            <app-symptom-entry-list />
          </section>
        }
      }
    </main>

    <app-footer-nav />
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
      }

      header {
        position: sticky;
        top: 0;
        background: #fff;
        border-bottom: 1px solid #e0e0e0;
        padding: 12px 16px;
        z-index: 10;
      }

      h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #4caf50;
      }

      main {
        flex: 1;
        padding: 16px;
        padding-bottom: calc(72px + env(safe-area-inset-bottom));
        display: flex;
        flex-direction: column;
        gap: 24px;
        max-width: 640px;
        width: 100%;
        margin: 0 auto;
        box-sizing: border-box;
      }

      h2 {
        margin: 0 0 8px;
        font-size: 1rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #888;
      }
    `,
  ],
})
export class HomeComponent {
  readonly uiStore = inject(UiStore);
}
