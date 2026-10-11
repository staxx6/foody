import { Component, inject } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { DishEntryListComponent } from '../dish-entry/dish-entry-list.component';
import { SymptomEntryListComponent } from '../symptom-entry/symptom-entry-list.component';
import { FooterNavComponent } from '../shared/footer/footer-nav.component';
import { UiStore } from '../shared/ui-store';
import { SyncStatusComponent } from '../shared/sync-status.component';
import { IconComponent } from '../shared/icon.component';
import { SettingsComponent } from '../settings/settings.component';
import { ManageListsComponent } from '../lists/manage-lists.component';
import { EditUnitFormComponent } from '../shared/edit-unit-form.component';
import { ConfirmDialogComponent } from '../shared/confirm/confirm-dialog.component';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { NewDishFormComponent } from '../dish/new-dish-form.component';
import { NewMealFormComponent } from '../dish-entry/new-meal-form.component';
import { NewHealthEntryFormComponent } from '../symptom-entry/new-health-entry-form.component';
import { NewSymptomFormComponent } from '../symptom-entry/new-symptom-form.component';

@Component({
  imports: [
    IconComponent,
    SettingsComponent,
    ManageListsComponent,
    EditUnitFormComponent,
    ConfirmDialogComponent,
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
      <h1>
        <button type="button" (click)="uiStore.goHome()" [title]="t().today">
          foody
        </button>
      </h1>
      <app-sync-status />
    </header>

    <main>
      @for (page of [uiStore.page()]; track page.key) {
        @switch (page.form) {
          @case ('new-food-item') {
            <app-new-food-item-form
              [editId]="page.editId"
              (saved)="uiStore.close()"
              (cancelled)="uiStore.close()"
            />
          }
          @case ('new-dish') {
            <app-new-dish-form
              [editId]="page.editId"
              (saved)="uiStore.close()"
              (cancelled)="uiStore.close()"
            />
          }
          @case ('new-meal') {
            <app-new-meal-form [editId]="page.editId" />
          }
          @case ('new-health-entry') {
            <app-new-health-entry-form [editId]="page.editId" />
          }
          @case ('new-symptom') {
            <app-new-symptom-form
              [editId]="page.editId"
              (saved)="uiStore.close()"
              (cancelled)="uiStore.close()"
            />
          }
          @case ('edit-unit') {
            <app-edit-unit-form
              [editId]="page.editId"
              (saved)="uiStore.close()"
              (cancelled)="uiStore.close()"
            />
          }
          @case ('lists') {
            <app-manage-lists />
          }
          @case ('settings') {
            <app-settings />
          }
          @default {
            <div class="day">
              <span class="day-label">{{ t().today }}</span
              ><span class="day-date">{{ i18n.formatDay(today) }}</span>
            </div>

            <section>
              <h2><app-icon name="meal" /> {{ t().meals }}</h2>
              <app-dish-entry-list class="card" />
            </section>

            <section>
              <h2><app-icon name="symptom" /> {{ t().health }}</h2>
              <app-symptom-entry-list class="card" />
            </section>
          }
        }
      }
    </main>

    <app-footer-nav />
    <app-confirm-dialog />
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
      }

      /* The logo leads back to today */
      h1 button {
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--primary);
        cursor: pointer;
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
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  readonly uiStore = inject(UiStore);
  protected readonly today = new Date();
}
