import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { I18n } from './i18n/i18n';
import { IconComponent } from './icon.component';

/**
 * Shows whether the entries of this device are on the server. Opens a window
 * that says what is wrong if they are not: a phone has no other place to
 * look it up.
 */
@Component({
  selector: 'app-sync-status',
  imports: [IconComponent],
  host: { '(click)': 'closeOnBackdrop($event)' },
  template: `
    <button
      type="button"
      class="status"
      [class]="status().kind"
      (click)="open()"
      [title]="t().synchronization"
    >
      <span class="dot" aria-hidden="true"></span>
      {{ status().label }}
    </button>

    <dialog #dialog (close)="isOpen.set(false)">
      @if (isOpen()) {
        <header>
          <h2>{{ t().synchronization }}</h2>
          <button
            type="button"
            class="icon-btn"
            (click)="dialog.close()"
            [attr.aria-label]="t().close"
          >
            <app-icon name="close" />
          </button>
        </header>

        <p class="state" [class]="status().kind">
          <span class="dot" aria-hidden="true"></span>
          <strong>{{ status().label }}</strong>
        </p>
        <p class="hint">{{ status().hint }}</p>

        @if (problem(); as problem) {
          <div class="problem">
            <span class="label">{{ t().errorDetails }}</span>
            <p>{{ problem }}</p>
          </div>
        }

        <dl>
          <div>
            <dt>{{ t().server }}</dt>
            <dd>{{ sync.serverUrl }}</dd>
          </div>
          <div>
            <dt>{{ t().lastSynchronized }}</dt>
            <dd>{{ lastSynchronized() }}</dd>
          </div>
          <div>
            <dt>{{ t().waitingToBeSent }}</dt>
            <dd>{{ sync.pendingCount() }}</dd>
          </div>
          <div>
            <dt>{{ t().appVersion }}</dt>
            <dd>{{ loadedAt }}</dd>
          </div>
        </dl>

        <div class="actions">
          <button type="button" class="secondary" (click)="copy()">
            <app-icon [name]="copied() ? 'check' : 'copy'" />
            {{ copied() ? t().copied : t().copyDetails }}
          </button>
          <button
            type="button"
            (click)="sync.sync()"
            [disabled]="sync.isSyncing()"
          >
            <app-icon name="sync" />
            {{ sync.isSyncing() ? t().synchronizing : t().synchronizeNow }}
          </button>
        </div>
      }
    </dialog>
  `,
  styles: [
    `
      .status {
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

      .dot {
        flex: none;
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

      dialog {
        width: min(480px, calc(100vw - 32px));
        max-height: calc(100dvh - 48px);
        padding: 20px;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
        color: var(--text);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
        /* The window itself gets the focus when it opens */
        outline: none;
      }

      dialog::backdrop {
        background: rgba(0, 0, 0, 0.45);
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      h2 {
        margin: 0;
        font-size: 1.25rem;
      }

      .icon-btn {
        margin: 0;
      }

      .state {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 4px;
      }

      .state .dot {
        width: 10px;
        height: 10px;
      }

      .hint {
        margin: 0 0 16px;
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      /* The words of the server, to be read and copied as they are */
      .problem {
        margin-bottom: 16px;
        padding: 12px;
        border-radius: var(--radius);
        background: var(--danger-soft);
        color: var(--danger);
      }

      .problem .label {
        font-size: 0.75rem;
        font-weight: 700;
      }

      .problem p {
        margin: 4px 0 0;
        font-size: 0.9rem;
        overflow-wrap: anywhere;
        user-select: text;
      }

      dl {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0 0 20px;
      }

      dl div {
        display: flex;
        gap: 12px;
        font-size: 0.9rem;
      }

      dt {
        flex: none;
        width: 9rem;
        color: var(--text-muted);
      }

      dd {
        min-width: 0;
        margin: 0;
        overflow-wrap: anywhere;
        user-select: text;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }

      .actions button {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        padding: 8px 16px;
        border: none;
        border-radius: var(--radius);
        background: var(--primary);
        color: var(--on-primary);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      .actions button.secondary {
        background: var(--field);
        color: var(--text);
      }

      .actions button:disabled {
        opacity: 0.6;
        cursor: default;
      }
    `,
  ],
})
export class SyncStatusComponent {
  protected readonly sync = inject(OfflineDataAccessService);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly isOpen = signal(false);
  protected readonly copied = signal(false);

  /** A phone can run an old copy of the app for long, which explains a lot */
  protected readonly loadedAt = this.i18n.formatDateTime(
    new Date(document.lastModified),
  );

  protected readonly lastSynchronized = computed(() => {
    const date = this.sync.lastSyncedAt();
    return date ? this.i18n.formatDateTime(date) : this.t().never;
  });

  /** What the server said, or why it was not reached */
  protected readonly problem = computed(
    () =>
      this.sync.syncError() ??
      (this.sync.isOnline() ? null : this.sync.connectionError()),
  );

  protected readonly status = computed(() => {
    const pending = this.sync.pendingCount();
    const t = this.t();
    const waiting = pending > 0 ? ` · ${t.toSend(pending)}` : '';

    if (this.sync.isSyncing()) {
      return { kind: 'syncing', label: t.synchronizing, hint: '' };
    }
    if (this.sync.syncError()) {
      return {
        kind: 'error',
        label: `${t.syncProblem}${waiting}`,
        hint: t.syncProblemHint,
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
      return { kind: 'pending', label: t.toSend(pending), hint: t.pendingHint };
    }
    return { kind: 'synced', label: t.synced, hint: t.syncedHint };
  });

  /** Shows the details and tries again, so they are those of right now */
  protected open(): void {
    this.isOpen.set(true);
    this.copied.set(false);
    this.dialog().nativeElement.showModal();
    void this.sync.sync();
  }

  /** Everything the window says as text, to send it to someone who helps */
  protected async copy(): Promise<void> {
    const t = this.t();
    const text = [
      `${t.synchronization}: ${this.status().label}`,
      this.problem(),
      `${t.server}: ${this.sync.serverUrl}`,
      `${t.lastSynchronized}: ${this.lastSynchronized()}`,
      `${t.waitingToBeSent}: ${this.sync.pendingCount()}`,
      `${t.appVersion}: ${this.loadedAt}`,
      location.href,
      navigator.userAgent,
    ]
      .filter((line) => !!line)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
    } catch {
      // Without access to the clipboard the text can still be marked
    }
  }

  /** A click next to the window closes it */
  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.dialog().nativeElement.close();
    }
  }
}
