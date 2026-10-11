import { Component, computed, inject } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { I18n } from './i18n/i18n';

/**
 * Shows whether the entries of this device are on the server
 */
@Component({
  selector: 'app-sync-status',
  template: `
    <button
      [class]="status().kind"
      (click)="sync.sync()"
      [disabled]="sync.isSyncing()"
      [title]="status().hint"
    >
      <span class="dot" aria-hidden="true"></span>
      {{ status().label }}
    </button>
  `,
  styles: [
    `
      button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border: none;
        border-radius: 999px;
        background: var(--bg);
        color: var(--text-muted);
        font-family: inherit;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
      }

      button:disabled {
        cursor: default;
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--success);
      }

      .offline .dot {
        background: var(--text-muted);
      }

      .pending .dot,
      .syncing .dot {
        background: var(--warning);
      }

      .error .dot {
        background: var(--danger);
      }
    `,
  ],
})
export class SyncStatusComponent {
  protected readonly sync = inject(OfflineDataAccessService);
  private readonly i18n = inject(I18n);
  private readonly t = this.i18n.t;

  protected readonly status = computed(() => {
    const pending = this.sync.pendingCount();
    const lastSynced = this.sync.lastSyncedAt();
    const t = this.t();
    const waiting = pending > 0 ? ` · ${t.toSend(pending)}` : '';

    if (this.sync.isSyncing()) {
      return { kind: 'syncing', label: t.synchronizing, hint: '' };
    }
    if (this.sync.syncError()) {
      return {
        kind: 'error',
        label: `${t.syncProblem}${waiting}`,
        hint: this.sync.syncError() ?? '',
      };
    }
    if (!this.sync.isOnline()) {
      return {
        kind: 'offline',
        label: `${t.offline}${waiting}`,
        hint: t.offlineHint,
      };
    }
    if (pending > 0) {
      return {
        kind: 'pending',
        label: t.toSend(pending),
        hint: t.tapToSend,
      };
    }
    return {
      kind: 'synced',
      label: t.synced,
      hint: lastSynced
        ? `{t.lastSynchronized}: {this.i18n.formatDateTime(lastSynced)}`
        : '',
    };
  });
}
