import { Component, inject, signal } from '@angular/core';
import { ActiveSite, UiStore } from '../ui-store';
import { FooterButtonComponent } from './footer-button.component';

@Component({
  selector: 'app-footer-nav',
  imports: [FooterButtonComponent],
  template: `
    @if (showMenu()) {
      <button
        class="backdrop"
        (click)="toggleMenu()"
        aria-label="Close menu"
      ></button>
      <div class="menu-popup">
        <section>
          <h3>Track today</h3>
          <p class="hint">Record what happened, with date and time.</p>
          <div class="tiles">
            <button class="tile" (click)="selectForm('new-meal')">
              <span class="icon" aria-hidden="true">🍽️</span>
              <span class="title">Log meal</span>
              <small>I ate or drank something</small>
            </button>
            <button class="tile" (click)="selectForm('new-health-entry')">
              <span class="icon" aria-hidden="true">🩺</span>
              <span class="title">Log symptom</span>
              <small>I noticed a symptom</small>
            </button>
          </div>
        </section>

        <section>
          <h3>Extend your lists</h3>
          <p class="hint">
            Something missing when logging? Add it once, pick it any time.
          </p>
          <button class="row" (click)="selectForm('new-food-item')">
            <span class="icon" aria-hidden="true">🍎</span>
            <span>
              <span class="title">New food item</span>
              <small>A single food, e.g. apple or milk</small>
            </span>
          </button>
          <button class="row" (click)="selectForm('new-dish')">
            <span class="icon" aria-hidden="true">🍲</span>
            <span>
              <span class="title">New dish</span>
              <small>A prepared meal, e.g. lasagne</small>
            </span>
          </button>
          <button class="row" (click)="selectForm('new-symptom')">
            <span class="icon" aria-hidden="true">🏷️</span>
            <span>
              <span class="title">New symptom type</span>
              <small>A kind of symptom, e.g. headache</small>
            </span>
          </button>
        </section>
      </div>
    }
    <nav>
      <app-footer-button
        label="Today"
        [active]="uiStore.isActive('today')"
        (clicked)="uiStore.goHome()"
      />
      <app-footer-button label='Month' [active]="false" />
      <button
        class="add-btn"
        (click)="toggleMenu()"
        [attr.aria-label]="showMenu() ? 'Close menu' : 'Add entry'"
        [attr.aria-expanded]="showMenu()"
      >
        {{ showMenu() ? '×' : '+' }}
      </button>
      <app-footer-button label='Report' [active]='false' />
      <app-footer-button label='Settings' [active]='false' />
    </nav>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 20;
        background: rgba(0, 0, 0, 0.25);
        border: none;
        cursor: default;
        padding: 0;
      }

      .menu-popup {
        position: fixed;
        bottom: calc(72px + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        z-index: 30;
        width: min(360px, calc(100vw - 32px));
        box-sizing: border-box;
      }

      .menu-popup section {
        display: flex;
        flex-direction: column;
      }

      .menu-popup section + section {
        border-top: 1px solid #f0f0f0;
        padding-top: 16px;
      }

      h3 {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #666;
      }

      .hint {
        margin: 2px 0 10px;
        font-size: 0.75rem;
        color: #888;
      }

      .menu-popup button {
        border: none;
        cursor: pointer;
        color: #333;
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
        color: #888;
      }

      .tiles {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .tile {
        padding: 12px 8px;
        background: #e8f5e9;
        border-radius: 12px;
        text-align: center;
      }

      .tile .icon {
        display: block;
        font-size: 1.6rem;
        margin-bottom: 4px;
      }

      .tile:hover {
        background: #d7edd9;
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
        font-size: 1.2rem;
        width: 1.5rem;
        text-align: center;
      }

      .row:hover {
        background: #f5f5f5;
      }

      nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        align-items: center;
        background: #fff;
        border-top: 1px solid #e0e0e0;
        padding: 8px 0 max(8px, env(safe-area-inset-bottom));
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
        z-index: 10;
      }

      nav .add-btn {
        font-size: 1.8rem;
        color: #fff;
        font-weight: bold;
        background-color: #4caf50;
        border-radius: 50%;
        width: 3rem;
        height: 3rem;
      }

      nav button {
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        // padding: 6px 4px;
      }

      nav button:hover {
        color: #333;
      }
    `,
  ],
})
export class FooterNavComponent {
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
