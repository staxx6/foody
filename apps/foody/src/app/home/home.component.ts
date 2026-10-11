import { Component, inject } from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { DayComponent } from './day.component';
import { MonthComponent } from '../month/month.component';
import { FooterNavComponent } from '../shared/footer/footer-nav.component';
import { UiStore } from '../shared/ui-store';
import { SyncStatusComponent } from '../shared/sync-status.component';
import { SettingsComponent } from '../settings/settings.component';
import { ManageListsComponent } from '../lists/manage-lists.component';
import { ReportComponent } from '../report/report.component';
import { ItemDetailsComponent } from '../details/item-details.component';
import { EditUnitFormComponent } from '../shared/edit-unit-form.component';
import { ConfirmDialogComponent } from '../shared/confirm/confirm-dialog.component';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { NewDishFormComponent } from '../dish/new-dish-form.component';
import { NewMealFormComponent } from '../dish-entry/new-meal-form.component';
import { NewHealthEntryFormComponent } from '../symptom-entry/new-health-entry-form.component';
import { NewSymptomFormComponent } from '../symptom-entry/new-symptom-form.component';
import { NewMedicationFormComponent } from '../medication/new-medication-form.component';
import { LogMedicationFormComponent } from '../medication/log-medication-form.component';

@Component({
  imports: [
    SettingsComponent,
    ManageListsComponent,
    ReportComponent,
    ItemDetailsComponent,
    EditUnitFormComponent,
    ConfirmDialogComponent,
    DayComponent,
    MonthComponent,
    FooterNavComponent,
    SyncStatusComponent,
    NewFoodItemFormComponent,
    NewDishFormComponent,
    NewMealFormComponent,
    NewHealthEntryFormComponent,
    NewSymptomFormComponent,
    NewMedicationFormComponent,
    LogMedicationFormComponent,
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
          @case ('new-medication') {
            <app-new-medication-form
              [editId]="page.editId"
              (saved)="uiStore.close()"
              (cancelled)="uiStore.close()"
            />
          }
          @case ('new-medication-entry') {
            <app-log-medication-form [editId]="page.editId" />
          }
          @case ('view-food') {
            <app-item-details kind="food" [id]="page.editId ?? ''" />
          }
          @case ('view-dish') {
            <app-item-details kind="dish" [id]="page.editId ?? ''" />
          }
          @case ('view-symptom') {
            <app-item-details kind="symptom" [id]="page.editId ?? ''" />
          }
          @case ('view-medication') {
            <app-item-details kind="medication" [id]="page.editId ?? ''" />
          }
          @case ('edit-unit') {
            <app-edit-unit-form
              [editId]="page.editId"
              (saved)="uiStore.close()"
              (cancelled)="uiStore.close()"
            />
          }
          @case ('month') {
            <app-month />
          }
          @case ('report') {
            <app-report />
          }
          @case ('lists') {
            <app-manage-lists />
          }
          @case ('settings') {
            <app-settings />
          }
          @default {
            <app-day />
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
        display: block;
        line-height: 1;
        padding: 0;
        /* The letters sit low in their line; this centers what is visible */
        transform: translateY(-3px);
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
    `,
  ],
})
export class HomeComponent {
  protected readonly t = inject(I18n).t;
  readonly uiStore = inject(UiStore);
}
