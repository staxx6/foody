import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DishEntryListComponent } from '../dish-entry/dish-entry-list.component';
import { SymptomEntryListComponent } from '../symptom-entry/symptom-entry-list.component';
import { FooterNavComponent } from '../shared/footer/footer-nav.component';
import { UiStore } from '../shared/ui-store';
import { SyncStatusComponent } from '../shared/sync-status.component';
import { IconComponent } from '../shared/icon.component';
import { SettingsComponent } from '../settings/settings.component';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { NewDishFormComponent } from '../dish/new-dish-form.component';
import { NewMealFormComponent } from '../dish-entry/new-meal-form.component';
import { NewHealthEntryFormComponent } from '../symptom-entry/new-health-entry-form.component';
import { NewSymptomFormComponent } from '../symptom-entry/new-symptom-form.component';

@Component({
  imports: [
    DatePipe,
    IconComponent,
    SettingsComponent,
    DishEntryListComponent,
    SymptomEntryListComponent,
    FooterNavComponent,
    SyncStatusComponent,
    NewFoodItemFormComponent,
    NewDishFormComponent,
    NewMealFormComponent,
    NewHealthEntryFormComponent,
    NewSymptomFormComponent,
  ],
  template: `
    <header>
      <h1>foody</h1>
      <app-sync-status />
    </header>

    <main>
      @switch (uiStore.activeForm()) {
        @case ('new-food-item') {
          <app-new-food-item-form
            (saved)="uiStore.goHome()"
            (cancelled)="uiStore.goHome()"
          />
        }
        @case ('new-dish') {
          <app-new-dish-form
            (saved)="uiStore.goHome()"
            (cancelled)="uiStore.goHome()"
          />
        }
        @case ('new-meal') {
          <app-new-meal-form />
        }
        @case ('new-health-entry') {
          <app-new-health-entry-form />
        }
        @case ('new-symptom') {
          <app-new-symptom-form
            (saved)="uiStore.goHome()"
            (cancelled)="uiStore.goHome()"
          />
        }
        @case ('settings') {
          <app-settings />
        }
        @default {
          <div class="day">
            <span class="day-label">Today</span>
            <span class="day-date">{{ today | date: 'EEEE, d MMMM' }}</span>
          </div>

          <section>
            <h2><app-icon name="meal" /> Meals</h2>
            <app-dish-entry-list class="card" />
          </section>

          <section>
            <h2><app-icon name="symptom" /> Health</h2>
            <app-symptom-entry-list class="card" />
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 12px 16px;
        z-index: 10;
      }

      h1 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--primary);
      }

      main {
        flex: 1;
        padding: 20px 16px;
        padding-bottom: calc(96px + env(safe-area-inset-bottom));
        display: flex;
        flex-direction: column;
        gap: 24px;
        max-width: 640px;
        width: 100%;
        margin: 0 auto;
      }

      .day {
        display: flex;
        flex-direction: column;
      }

      .day-label {
        font-size: 1.5rem;
        font-weight: 700;
      }

      .day-date {
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      h2 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 8px 4px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .card {
        display: block;
        overflow: hidden;
      }
    `,
  ],
})
export class HomeComponent {
  readonly uiStore = inject(UiStore);
  protected readonly today = new Date();
}
