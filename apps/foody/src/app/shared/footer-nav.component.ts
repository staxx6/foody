import { Component, inject, signal } from '@angular/core';
import { ActiveForm, UiStore } from './ui-store';

@Component({
  selector: 'app-footer-nav',
  template: `
    @if (showMenu()) {
      <button
        class="backdrop"
        (click)="toggleMenu()"
        aria-label="Close menu"
      ></button>
      <div class="menu-popup">
        <button (click)="selectForm('new-food-item')">New Food Item</button>
        <button (click)="selectForm('new-dish')">New Dish</button>
        <button (click)="selectForm('new-meal')">New Meal</button>
        <button (click)="selectForm('new-health-entry')">
          New Health Entry
        </button>
        <button (click)="selectForm('new-symptom')">New Symptom</button>
      </div>
    }
    <nav>
      <button>Today</button>
      <button>Month</button>
      <button class="add-btn" (click)="toggleMenu()">+</button>
      <button>Report</button>
      <button>Settings</button>
    </nav>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 20;
        background: transparent;
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
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 30;
        min-width: 200px;
      }

      .menu-popup button {
        padding: 14px 20px;
        background: none;
        border: none;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        font-size: 0.95rem;
        color: #333;
        text-align: left;
      }

      .menu-popup button:last-child {
        border-bottom: none;
      }

      .menu-popup button:hover {
        background: #f9f9f9;
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

      nav button {
        flex: 1;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.75rem;
        color: #666;
        padding: 6px 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      nav button:hover {
        color: #333;
      }

      .add-btn {
        font-size: 1.8rem;
        line-height: 1;
        color: #4caf50;
        font-weight: bold;
      }
    `,
  ],
})
export class FooterNavComponent {
  private readonly uiStore = inject(UiStore);
  readonly showMenu = signal(false);

  toggleMenu(): void {
    this.showMenu.update((v) => !v);
  }

  selectForm(form: ActiveForm): void {
    this.uiStore.showForm(form);
    this.showMenu.set(false);
  }
}
