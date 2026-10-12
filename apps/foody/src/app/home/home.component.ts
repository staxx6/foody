import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { isField, Keyboard } from '../shared/keyboard/keyboard';
import {
  KeyHint,
  KeyHintsComponent,
} from '../shared/keyboard/key-hints.component';
import { ShortcutHelpComponent } from '../shared/keyboard/shortcut-help.component';
import { SymptomFollowUpFormComponent } from '../symptom-entry/symptom-follow-up-form.component';
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
    SymptomFollowUpFormComponent,
    KeyHintsComponent,
    ShortcutHelpComponent,
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

    <div class="scroll" #scroll>
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
            @case ('new-follow-up') {
              <app-symptom-follow-up-form
                [entryId]="page.editId"
                (closed)="uiStore.close()"
              />
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
        @if (keyHints().length > 0) {
          <app-key-hints [hints]="keyHints()" />
        }
      </main>
    </div>

    <app-footer-nav />
    <app-confirm-dialog />
    <app-shortcut-help />
  `,
  styles: [
    `
      /*
       * The page is a column that fills the screen: header, the content,
       * which scrolls, and the navigation. The navigation is part of the
       * column instead of fixed to the screen, as Firefox on Android
       * sometimes stops drawing the content of fixed elements.
       */
      :host {
        display: flex;
        flex-direction: column;
        height: 100dvh;
        overflow: hidden;
      }

      .scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex: none;
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
        padding: 20px 16px 40px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        max-width: 640px;
        width: 100%;
        margin: 0 auto;
      }

      /* Wide screens: the navigation is a sidebar (see footer-nav) and the
         pages use the width */
      @media (min-width: 1024px) {
        /* The page itself scrolls, next to the fixed sidebar */
        :host {
          display: block;
          height: auto;
          min-height: 100dvh;
          overflow: visible;
        }

        .scroll {
          overflow: visible;
        }

        header {
          display: none;
        }

        main {
          width: auto;
          max-width: 1240px;
          margin: 0 0 0 248px;
          padding: 40px 48px 48px;
          gap: 28px;
        }

        /* Forms stay as narrow as they are comfortable to fill in */
        app-new-meal-form,
        app-new-health-entry-form,
        app-log-medication-form,
        app-new-food-item-form,
        app-new-dish-form,
        app-new-symptom-form,
        app-new-medication-form,
        app-symptom-follow-up-form,
        app-edit-unit-form {
          max-width: 680px;
        }
      }
    `,
  ],
})
export class HomeComponent {
  protected readonly t = inject(I18n).t;
  readonly uiStore = inject(UiStore);
  private readonly keyboard = inject(Keyboard);

  private readonly scroll =
    viewChild.required<ElementRef<HTMLElement>>('scroll');

  /** The keys of the page that is shown; the forms name theirs themselves */
  protected readonly keyHints = computed<KeyHint[]>(() => {
    const t = this.t();
    const keys = t.shortcuts;
    const rows: KeyHint[] = [
      { keys: ['↑', '↓'], label: keys.selectEntry },
      { keys: ['E'], label: t.edit },
      { keys: [t.keyDelete], label: t.delete },
    ];
    const help: KeyHint = { keys: ['?'], label: t.allShortcuts };

    switch (this.uiStore.activeForm()) {
      case 'today':
        return [
          { keys: ['←', '→'], label: keys.changeDay },
          { keys: ['T'], label: t.today },
          ...rows,
          { keys: ['Enter'], label: t.actions },
          { keys: ['F'], label: t.followUp },
          help,
        ];
      case 'month':
        return [
          { keys: ['←', '→'], label: keys.changeMonth },
          { keys: ['T'], label: t.backToCurrentMonth },
          { keys: ['↑', '↓'], label: keys.calendar },
          { keys: ['Enter'], label: keys.openDay },
          help,
        ];
      case 'lists':
        return [{ keys: ['/'], label: keys.search }, ...rows, help];
      case 'report':
        return [{ keys: ['X'], label: t.exportExcel }, help];
      case 'view-food':
      case 'view-dish':
      case 'view-symptom':
      case 'view-medication':
        return [
          { keys: ['E'], label: t.edit },
          { keys: ['Esc'], label: t.back },
          help,
        ];
      case 'settings':
        return [help];
      default:
        return [];
    }
  });

  constructor() {
    // Every page starts at its top
    effect(() => {
      this.uiStore.page();
      this.scroll().nativeElement.scrollTop = 0;
      window.scrollTo(0, 0);
    });

    // The keys that work on every page
    this.keyboard.bind({
      '?': () => this.keyboard.isHelpOpen.set(true),
      Escape: (event) => this.leave(event),
      'ctrl+enter': () =>
        this.visible<HTMLFormElement>('form')?.requestSubmit(),
      ArrowDown: () => this.moveToRow(1),
      ArrowUp: () => this.moveToRow(-1),
    });
  }

  /** Escape leaves the field that is typed into, otherwise the page */
  private leave(event: KeyboardEvent): boolean {
    if (isField(event.target)) {
      (event.target as HTMLElement).blur();
      return true;
    }
    // The button of the form that is shown, which may be one opened from
    // another form (e.g. a new symptom while logging one)
    const back = this.visible('.back-btn');
    back?.click();
    return !!back;
  }

  /**
   * Moves the focus to the next or previous row (see row.directive)
   * @returns false if the page has no rows, so the arrow keys scroll it
   */
  private moveToRow(step: number): boolean {
    const rows = this.allVisible('[data-row]');
    if (rows.length === 0) return false;

    // The focus may also be on a button of a row
    const focused = document.activeElement?.closest('[data-row]');
    const current = rows.findIndex((row) => row === focused);
    const next =
      current < 0
        ? step > 0
          ? 0
          : rows.length - 1
        : Math.min(Math.max(current + step, 0), rows.length - 1);
    rows[next].focus();
    return true;
  }

  private visible<T extends HTMLElement>(selector: string): T | undefined {
    return this.allVisible<T>(selector)[0];
  }

  /** The matching elements of the page that are not hidden */
  private allVisible<T extends HTMLElement>(selector: string): T[] {
    return Array.from(
      this.scroll().nativeElement.querySelectorAll<T>(selector),
    ).filter((element) => element.offsetParent !== null);
  }
}
