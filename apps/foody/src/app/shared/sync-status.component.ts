import { Component, computed, inject } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';

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

  protected readonly status = computed(() => {
    const pending = this.sync.pendingCount();
    const waiting = pending > 0 ? ` · ${pending} to send` : '';

    if (this.sync.isSyncing()) {
      return { kind: 'syncing', label: 'Syncing…', hint: '' };
    }
    if (this.sync.syncError()) {
      return {
        kind: 'error',
        label: `Sync problem${waiting}`,
        hint: this.sync.syncError() ?? '',
      };
    }
    if (!this.sync.isOnline()) {
      return {
        kind: 'offline',
        label: `Offline${waiting}`,
        hint: 'Server not reachable. Entries are kept on this device. Tap to retry.',
      };
    }
    if (pending > 0) {
      return {
        kind: 'pending',
        label: `${pending} to send`,
        hint: 'Tap to send',
      };
    }
    return {
      kind: 'synced',
      label: 'Synced',
      hint: `Last synchronized: ${this.sync.lastSyncedAt()?.toLocaleTimeString() ?? '–'}`,
    };
  });
}
