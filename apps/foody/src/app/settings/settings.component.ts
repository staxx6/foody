import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { IconComponent, IconName } from '../shared/icon.component';
import { ACCENTS, SettingsStore, Theme } from '../shared/settings-store';

@Component({
  selector: 'app-settings',
  imports: [DatePipe, IconComponent],
  template: `
    <h2 class="page-title">Settings</h2>

    <section>
      <h3>Appearance</h3>
      <div class="card">
        <div class="setting">
          <span class="label">Theme</span>
          <div class="segments" role="group" aria-label="Theme">
            @for (theme of themes; track theme.value) {
              <button
                type="button"
                [class.active]="settings.theme() === theme.value"
                [attr.aria-pressed]="settings.theme() === theme.value"
                (click)="settings.theme.set(theme.value)"
              >
                <app-icon [name]="theme.icon" />
                {{ theme.label }}
              </button>
            }
          </div>
        </div>

        <div class="setting">
          <span class="label">Color</span>
          <div class="swatches" role="group" aria-label="Color">
            @for (accent of accents; track accent) {
              <button
                type="button"
                class="swatch"
                [attr.data-accent]="accent"
                [attr.aria-label]="accent"
                [attr.aria-pressed]="settings.accent() === accent"
                [title]="accent"
                (click)="settings.accent.set(accent)"
              >
                @if (settings.accent() === accent) {
                  <app-icon name="check" />
                }
              </button>
            }
          </div>
        </div>
      </div>
    </section>

    <section>
      <h3>Synchronization</h3>
      <div class="card">
        <dl>
          <div>
            <dt>Server</dt>
            <dd>{{ sync.isOnline() ? 'Reachable' : 'Not reachable' }}</dd>
          </div>
          <div>
            <dt>Last synchronized</dt>
            <dd>
              {{ (sync.lastSyncedAt() | date: 'dd.MM.yyyy, HH:mm') ?? 'Never' }}
            </dd>
          </div>
          <div>
            <dt>Waiting to be sent</dt>
            <dd>{{ sync.pendingCount() }}</dd>
          </div>
        </dl>
        @if (sync.syncError()) {
          <p class="error">{{ sync.syncError() }}</p>
        }
        <button
          type="button"
          class="sync-btn"
          (click)="sync.sync()"
          [disabled]="sync.isSyncing()"
        >
          <app-icon name="sync" />
          {{ sync.isSyncing() ? 'Synchronizing…' : 'Synchronize now' }}
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .page-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      h3 {
        margin: 0 0 8px 4px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .card {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 16px;
      }

      .setting {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-muted);
      }

      .segments {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4px;
        padding: 4px;
        border-radius: var(--radius);
        background: var(--bg);
      }

      .segments button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 40px;
        border: none;
        border-radius: 9px;
        background: none;
        color: var(--text-muted);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }

      .segments button.active {
        background: var(--surface);
        color: var(--primary);
        box-shadow: var(--shadow);
      }

      .swatches {
        display: flex;
        gap: 12px;
      }

      .swatch {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        border: none;
        border-radius: 50%;
        /* --primary of the accent this swatch stands for */
        background: var(--primary);
        color: var(--on-primary);
        cursor: pointer;
      }

      .swatch[aria-pressed='true'] {
        box-shadow:
          0 0 0 3px var(--surface),
          0 0 0 5px var(--primary);
      }

      dl {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 0;
      }

      dl div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.9rem;
      }

      dt {
        color: var(--text-muted);
      }

      dd {
        margin: 0;
        font-weight: 600;
        text-align: right;
      }

      .error {
        margin: 0;
        color: var(--danger);
        font-size: 0.85rem;
      }

      .sync-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
      }

      .sync-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
    `,
  ],
})
export class SettingsComponent {
  protected readonly settings = inject(SettingsStore);
  protected readonly sync = inject(OfflineDataAccessService);

  protected readonly accents = ACCENTS;
  protected readonly themes: { value: Theme; label: string; icon: IconName }[] =
    [
      { value: 'system', label: 'System', icon: 'system' },
      { value: 'light', label: 'Light', icon: 'sun' },
      { value: 'dark', label: 'Dark', icon: 'moon' },
    ];
}
