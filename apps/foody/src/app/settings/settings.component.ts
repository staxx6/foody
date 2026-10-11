import { Component, computed, inject } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { IconComponent, IconName } from '../shared/icon.component';
import { I18n } from '../shared/i18n/i18n';
import {
  ACCENTS,
  LanguageSetting,
  SettingsStore,
  Theme,
} from '../shared/settings-store';

@Component({
  selector: 'app-settings',
  imports: [IconComponent],
  template: `
    <h2 class="page-title">{{ t().settings }}</h2>

    <section>
      <h3>{{ t().appearance }}</h3>
      <div class="card">
        <div class="setting">
          <span class="label">{{ t().language }}</span>
          <div class="segments" role="group" [attr.aria-label]="t().language">
            @for (language of languages; track language.value) {
              <button
                type="button"
                [class.active]="settings.language() === language.value"
                [attr.aria-pressed]="settings.language() === language.value"
                (click)="settings.language.set(language.value)"
              >
                {{ language.label ?? t().system }}
              </button>
            }
          </div>
        </div>

        <div class="setting">
          <span class="label">{{ t().theme }}</span>
          <div class="segments" role="group" [attr.aria-label]="t().theme">
            @for (theme of themes; track theme.value) {
              <button
                type="button"
                [class.active]="settings.theme() === theme.value"
                [attr.aria-pressed]="settings.theme() === theme.value"
                (click)="settings.theme.set(theme.value)"
              >
                <app-icon [name]="theme.icon" />
                {{ t()[theme.value] }}
              </button>
            }
          </div>
        </div>

        <div class="setting">
          <span class="label">{{ t().color }}</span>
          <div class="swatches" role="group" [attr.aria-label]="t().color">
            @for (accent of accents; track accent) {
              <button
                type="button"
                class="swatch"
                [attr.data-accent]="accent"
                [attr.aria-label]="t().accents[accent]"
                [attr.aria-pressed]="settings.accent() === accent"
                [title]="t().accents[accent]"
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
      <h3>{{ t().synchronization }}</h3>
      <div class="card">
        <dl>
          <div>
            <dt>{{ t().server }}</dt>
            <dd>{{ sync.isOnline() ? t().reachable : t().notReachable }}</dd>
          </div>
          <div>
            <dt>{{ t().lastSynchronized }}</dt>
            <dd>{{ lastSynchronized() }}</dd>
          </div>
          <div>
            <dt>{{ t().waitingToBeSent }}</dt>
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
          {{ sync.isSyncing() ? t().synchronizing : t().synchronizeNow }}
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
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;

  protected readonly accents = ACCENTS;
  protected readonly themes: { value: Theme; icon: IconName }[] = [
    { value: 'system', icon: 'system' },
    { value: 'light', icon: 'sun' },
    { value: 'dark', icon: 'moon' },
  ];
  // The languages are named in themselves; 'system' follows the browser
  protected readonly languages: { value: LanguageSetting; label?: string }[] = [
    { value: 'system' },
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' },
  ];

  protected readonly lastSynchronized = computed(() => {
    const date = this.sync.lastSyncedAt();
    return date ? this.i18n.formatDateTime(date) : this.t().never;
  });
}
