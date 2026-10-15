import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { I18n } from '../shared/i18n/i18n';
import { isField, isWideScreen, Keyboard } from '../shared/keyboard/keyboard';
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
import { UndoToastComponent } from '../shared/confirm/undo-toast.component';
import { NewFoodItemFormComponent } from '../ingredient/new-food-item-form.component';
import { NewDishFormComponent } from '../dish/new-dish-form.component';
import { NewMealFormComponent } from '../dish-entry/new-meal-form.component';
import { NewHealthEntryFormComponent } from '../symptom-entry/new-health-entry-form.component';
import { NewSymptomFormComponent } from '../symptom-entry/new-symptom-form.component';
import { NewMedicationFormComponent } from '../medication/new-medication-form.component';
import { LogMedicationFormComponent } from '../medication/log-medication-form.component';
import { NoteFormComponent } from '../note/note-form.component';

@Component({
  imports: [
    NgTemplateOutlet,
    SettingsComponent,
    ManageListsComponent,
    ReportComponent,
    ItemDetailsComponent,
    EditUnitFormComponent,
    ConfirmDialogComponent,
    UndoToastComponent,
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
    NoteFormComponent,
    SymptomFollowUpFormComponent,
    KeyHintsComponent,
    ShortcutHelpComponent,
  ],
  host: {
    // What is entered or chosen in a form is input that can get lost
    '(input)': 'markDirty($event)',
    '(change)': 'markDirty($event)',
    '(click)': 'markDirtyByToggle($event)',
  },
  template: `
    <header>
      <h1>
        <button type="button" (click)="uiStore.goHome()" [title]="t().today">
          foody
        </button>
      </h1>
      <app-sync-status />
    </header>

    <!-- What a page shows, by its name -->
    <ng-template #pages let-page>
      @switch (page.form) {
        @case ('new-food-item') {
          <app-new-food-item-form
            [editId]="page.editId"
            (saved)="uiStore.done($event.id)"
            (cancelled)="uiStore.close()"
          />
        }
        @case ('new-dish') {
          <app-new-dish-form
            [editId]="page.editId"
            (saved)="uiStore.done($event.id)"
            (cancelled)="uiStore.close()"
          />
        }
        @case ('new-meal') {
          <app-new-meal-form [editId]="page.editId" [copyId]="page.copyId" />
        }
        @case ('new-health-entry') {
          <app-new-health-entry-form
            [editId]="page.editId"
            [copyId]="page.copyId"
          />
        }
        @case ('new-symptom') {
          <app-new-symptom-form
            [editId]="page.editId"
            (saved)="uiStore.done($event.id)"
            (cancelled)="uiStore.close()"
          />
        }
        @case ('new-medication') {
          <app-new-medication-form
            [editId]="page.editId"
            (saved)="uiStore.done($event.id)"
            (cancelled)="uiStore.close()"
          />
        }
        @case ('new-medication-entry') {
          <app-log-medication-form
            [editId]="page.editId"
            [copyId]="page.copyId"
          />
        }
        @case ('new-note') {
          <app-note-form [editId]="page.editId" />
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
            (saved)="uiStore.done(page.editId ?? undefined)"
            (cancelled)="uiStore.close()"
          />
        }
        @case ('edit-unit') {
          <app-edit-unit-form
            [editId]="page.editId"
            (saved)="uiStore.done(page.editId ?? undefined)"
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
    </ng-template>

    <div class="scroll" #scroll>
      <main>
        @for (page of [mainPage()]; track page.key) {
          <ng-container
            *ngTemplateOutlet="pages; context: { $implicit: page }"
          />
        }
        @if (keyHints().length > 0) {
          <app-key-hints [hints]="keyHints()" />
        }
      </main>
    </div>

    <!-- Wide screens: a form opens at the side of the page it was opened
         from, which stays visible -->
    @if (panelPage(); as page) {
      <button
        type="button"
        class="panel-backdrop"
        tabindex="-1"
        (click)="uiStore.close()"
        [attr.aria-label]="t().close"
      ></button>
      <aside class="side-panel">
        @for (panel of [page]; track panel.key) {
          <ng-container
            *ngTemplateOutlet="pages; context: { $implicit: panel }"
          />
        }
      </aside>
    }

    <app-footer-nav />
    <app-undo-toast />
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

      .panel-backdrop {
        display: none;
      }

      /* Only opened on wide screens. Should the window get narrow while it
         is open, it covers the page like a form on a small screen. */
      .side-panel {
        /* A column like the page, which also makes the form a block */
        display: flex;
        flex-direction: column;
        position: fixed;
        inset: 0;
        z-index: 15;
        padding: 20px 16px 40px;
        overflow-y: auto;
        background: var(--bg);
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
          max-width: 1320px;
          /* In the middle of the room next to the sidebar */
          margin: 0 0 0 max(248px, calc((100vw + 248px - 1320px) / 2));
          padding: 40px 48px 48px;
          gap: 28px;
        }

        /* A form opens at the side: the page behind it stays visible but is
           out of reach until the form is closed */
        .panel-backdrop {
          display: block;
          position: fixed;
          inset: 0 0 0 248px;
          z-index: 14;
          padding: 0;
          border: none;
          background: rgba(0, 0, 0, 0.2);
          cursor: default;
        }

        .side-panel {
          left: auto;
          width: min(620px, 50vw);
          padding: 40px 32px;
          overflow-y: auto;
          border-left: 1px solid var(--border);
          background: var(--bg);
          box-shadow: -12px 0 32px rgba(0, 0, 0, 0.14);
        }
      }
    `,
  ],
})
export class HomeComponent {
  protected readonly t = inject(I18n).t;
  readonly uiStore = inject(UiStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly keyboard = inject(Keyboard);

  /** Whether the layout of wide screens is shown */
  private readonly isWide = signal(isWideScreen());

  /**
   * A form that is shown in a panel at the side of the page it was opened
   * from, which wide screens have the room for
   */
  protected readonly panelPage = computed(() =>
    this.isWide() && this.uiStore.isEditing() ? this.uiStore.page() : null,
  );
  /** The page itself: behind the panel, the one the form was opened from */
  protected readonly mainPage = computed(() =>
    this.panelPage() ? this.uiStore.background() : this.uiStore.page(),
  );

  private readonly scroll =
    viewChild.required<ElementRef<HTMLElement>>('scroll');

  /** The keys of the page that is shown; the forms name theirs themselves */
  protected readonly keyHints = computed<KeyHint[]>(() => {
    const t = this.t();
    const keys = t.shortcuts;
    const select: KeyHint = { keys: ['↑', '↓'], label: keys.selectEntry };
    const menu: KeyHint = { keys: ['Enter'], label: t.actions };
    // Only what gets one started; the help window has all of them
    const help: KeyHint = { keys: ['?'], label: t.allShortcuts };

    switch (this.uiStore.activeForm()) {
      case 'today':
        return [
          { keys: ['←', '→'], label: keys.changeDay },
          select,
          menu,
          help,
        ];
      case 'month':
        return [
          { keys: ['←', '→'], label: keys.changeMonth },
          { keys: ['↑', '↓'], label: keys.calendar },
          help,
        ];
      case 'lists':
        return [{ keys: ['/'], label: keys.search }, select, menu, help];
      case 'report':
        return [{ keys: ['X'], label: t.exportExcel }, help];
      case 'view-food':
      case 'view-dish':
      case 'view-symptom':
      case 'view-medication':
        return [{ keys: ['E'], label: t.edit }, help];
      case 'settings':
        return [help];
      default:
        return [];
    }
  });

  constructor() {
    // Every page starts at its top; a form at the side leaves the page alone
    effect(() => {
      this.mainPage();
      this.scroll().nativeElement.scrollTop = 0;
      window.scrollTo(0, 0);
    });

    // The layout follows the width of the window, but a form stays where it
    // was opened: moving it would lose its input
    const wide = window.matchMedia('(min-width: 1024px)');
    wide.addEventListener('change', () => {
      if (!this.uiStore.isEditing()) this.isWide.set(wide.matches);
    });
    effect(() => {
      if (!this.uiStore.isEditing()) this.isWide.set(wide.matches);
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

  /** Input into a form of the page: leaving it asks first (see UiStore) */
  protected markDirty(event: Event): void {
    const target = event.target as HTMLElement;
    // A field reports typing as input. Its change follows when it loses the
    // focus, which can be after its form was saved and closed.
    const isLate =
      event.type === 'change' &&
      target.matches('input:not([type=file]), textarea');
    if (isLate || !target.closest('form')) return;
    if (this.uiStore.isEditing()) this.uiStore.isDirty.set(true);
  }

  /** The buttons to choose one of several options do not report a change */
  protected markDirtyByToggle(event: Event): void {
    if ((event.target as HTMLElement).closest('.toggle button')) {
      this.markDirty(event);
    }
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
    const host = this.host.nativeElement;
    // A form at the side is what is used, not the page behind it
    const root = host.querySelector('.side-panel') ?? host;
    return Array.from(root.querySelectorAll<T>(selector)).filter(
      (element) => element.offsetParent !== null,
    );
  }
}
