import { Component, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n';
import { ActiveSite, UiStore } from '../ui-store';
import { FooterButtonComponent } from './footer-button.component';
import { IconComponent } from '../icon.component';
import { SyncStatusComponent } from '../sync-status.component';

@Component({
  selector: 'app-footer-nav',
  imports: [FooterButtonComponent, IconComponent, SyncStatusComponent],
  template: `
    @if (showMenu()) {
      <button
        class="backdrop"
        (click)="toggleMenu()"
        [attr.aria-label]="t().closeMenu"
      ></button>
      <div class="menu-popup">
        <section>
          <h3>{{ t().trackToday }}</h3>
          <p class="hint">{{ t().trackTodayHint }}</p>
          <div class="tiles">
            <button class="tile" (click)="selectForm('new-meal')">
              <app-icon class="icon" name="meal" /><span class="title">{{
                t().logMeal
              }}</span
              ><small>{{ t().logMealHint }}</small>
            </button>
            <button class="tile" (click)="selectForm('new-health-entry')">
              <app-icon class="icon" name="symptom" /><span class="title">{{
                t().logSymptom
              }}</span
              ><small>{{ t().logSymptomHint }}</small>
            </button>
            <button class="tile" (click)="selectForm('new-medication-entry')">
              <app-icon class="icon" name="pill" />
              <span class="title">{{ t().logMedication }}</span>
              <small>{{ t().logMedicationHint }}</small>
            </button>
          </div>
        </section>

        <section>
          <h3>{{ t().addToLists }}</h3>
          <p class="hint">{{ t().addToListsHint }}</p>
          <button class="row" (click)="selectForm('new-food-item')">
            <app-icon class="icon" name="food" />
            <span
              ><span class="title">{{ t().newFood }}</span
              ><small>{{ t().newFoodHint }}</small></span
            >
          </button>
          <button class="row" (click)="selectForm('new-dish')">
            <app-icon class="icon" name="dish" />
            <span
              ><span class="title">{{ t().newDish }}</span
              ><small>{{ t().newDishHint }}</small></span
            >
          </button>
          <button class="row" (click)="selectForm('new-symptom')">
            <app-icon class="icon" name="tag" />
            <span
              ><span class="title">{{ t().newSymptom }}</span
              ><small>{{ t().newSymptomHint }}</small></span
            >
          </button>
          <button class="row" (click)="selectForm('new-medication')">
            <app-icon class="icon" name="pill" />
            <span>
              <span class="title">{{ t().newMedication }}</span>
              <small>{{ t().newMedicationHint }}</small>
            </span>
          </button>
          <button class="row" (click)="selectForm('lists')">
            <app-icon class="icon" name="list" />
            <span>
              <span class="title">{{ t().manageLists }}</span>
              <small>{{ t().manageListsHint }}</small>
            </span>
          </button>
        </section>
      </div>
    }
    <nav>
      <button
        type="button"
        class="brand wide-only"
        (click)="uiStore.goHome()"
        [title]="t().today"
      >
        foody
      </button>
      <app-footer-button
        [label]="t().today"
        icon="today"
        [active]="uiStore.isActive('today')"
        (clicked)="uiStore.goHome()"
      />
      <app-footer-button
        [label]="t().month"
        icon="month"
        [active]="uiStore.isActive('month')"
        (clicked)="selectForm('month')"
      />
      <button
        class="add-btn"
        (click)="toggleMenu()"
        [attr.aria-label]="showMenu() ? t().closeMenu : t().addEntry"
        [attr.aria-expanded]="showMenu()"
      >
        <app-icon [name]="showMenu() ? 'close' : 'plus'" />
        <span class="add-label wide-only">{{ t().addEntry }}</span>
      </button>
      <app-footer-button
        [label]="t().report"
        icon="report"
        [active]="uiStore.isActive('report')"
        (clicked)="selectForm('report')"
      />
      <app-footer-button
        class="wide-only"
        [label]="t().lists"
        icon="list"
        [active]="uiStore.isActive('lists')"
        (clicked)="selectForm('lists')"
      />
      <app-footer-button
        class="last"
        [label]="t().settings"
        icon="settings"
        [active]="uiStore.isActive('settings')"
        (clicked)="selectForm('settings')"
      />
      <app-sync-status class="status wide-only" />
    </nav>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 20;
        background: rgba(0, 0, 0, 0.4);
        border: none;
        cursor: default;
        padding: 0;
      }

      .menu-popup {
        position: fixed;
        bottom: calc(72px + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        z-index: 30;
        width: min(420px, calc(100vw - 32px));
        max-height: calc(100dvh - 120px - env(safe-area-inset-bottom));
        overflow-y: auto;
        box-sizing: border-box;
      }

      .menu-popup section {
        display: flex;
        flex-direction: column;
      }

      .menu-popup section + section {
        border-top: 1px solid var(--border);
        padding-top: 16px;
      }

      h3 {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
      }

      .hint {
        margin: 2px 0 10px;
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      .menu-popup button {
        border: none;
        cursor: pointer;
        color: var(--text);
        font-family: inherit;
      }

      .title {
        display: block;
        font-size: 0.95rem;
        font-weight: 600;
      }

      .menu-popup small {
        display: block;
        margin-top: 2px;
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      .tiles {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .tile {
        padding: 12px 8px;
        background: var(--primary-soft);
        border-radius: 12px;
        text-align: center;
      }

      .tile {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .tile .icon {
        font-size: 1.5rem;
        margin-bottom: 6px;
        color: var(--primary);
      }

      .tile:hover {
        background: color-mix(in srgb, var(--primary) 20%, var(--surface));
      }

      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        background: none;
        border-radius: 8px;
        text-align: left;
      }

      .row .icon {
        font-size: 1.1rem;
        color: var(--text-muted);
      }

      .row:hover {
        background: var(--bg);
      }

      :host {
        flex: none;
      }

      /* Part of the column of the page, see home.component */
      nav {
        position: relative;
        display: grid;
        grid-template-columns: 1fr 1fr auto 1fr 1fr;
        align-items: center;
        background: var(--surface);
        border-top: 1px solid var(--border);
        padding: 6px 8px max(6px, env(safe-area-inset-bottom));
        z-index: 10;
      }

      .add-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        margin: -20px 8px 0;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: var(--primary);
        color: var(--on-primary);
        font-size: 24px;
        box-shadow:
          0 0 0 4px var(--bg),
          0 4px 10px rgba(0, 0, 0, 0.2);
        cursor: pointer;
      }

      .add-btn:hover {
        background: var(--primary-hover);
      }

      /* Only part of the sidebar of wide screens */
      .wide-only {
        display: none;
      }

      /* Wide screens: the bar at the bottom becomes a sidebar */
      @media (min-width: 1024px) {
        nav {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          width: 248px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 4px;
          padding: 28px 16px 20px;
          border-top: none;
          border-right: 1px solid var(--border);
        }

        .brand {
          display: block;
          order: 0;
          margin: 0 12px 24px;
          padding: 0;
          border: none;
          background: none;
          color: var(--primary);
          font-size: 1.7rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-align: left;
          cursor: pointer;
        }

        .add-btn {
          order: 1;
          width: auto;
          height: 48px;
          margin: 0 0 20px;
          gap: 8px;
          border-radius: var(--radius);
          box-shadow: none;
          font-size: 1.2rem;
        }

        .add-label {
          display: inline;
          font-size: 1rem;
          font-weight: 600;
        }

        app-footer-button {
          order: 2;
        }

        app-footer-button.wide-only {
          display: block;
        }

        app-footer-button.last {
          order: 3;
        }

        .status {
          display: block;
          order: 4;
          margin-top: auto;
          align-self: flex-start;
        }

        /* The menu opens next to the button instead of above the bar */
        .menu-popup {
          top: 80px;
          bottom: auto;
          left: 264px;
          transform: none;
          max-height: calc(100dvh - 104px);
        }
      }
    `,
  ],
})
export class FooterNavComponent {
  protected readonly t = inject(I18n).t;
  protected readonly uiStore = inject(UiStore);
  protected readonly showMenu = signal(false);

  toggleMenu(): void {
    this.showMenu.update((v) => !v);
  }

  selectForm(form: ActiveSite): void {
    this.uiStore.showForm(form);
    this.showMenu.set(false);
  }
}
