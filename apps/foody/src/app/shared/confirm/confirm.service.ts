import { inject, Injectable, signal } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { I18n } from '../i18n/i18n';

export type ConfirmRequest = {
  title: string;
  message: string;
  /** Without it the dialog only informs and has a single OK button */
  confirmLabel?: string;
  /** What the button that does not confirm says; "Cancel" by default */
  cancelLabel?: string;
  resolve: (confirmed: boolean) => void;
};

/** A record that looks deleted but can still be brought back */
type PendingDelete = { id: string; name: string; remove: () => Promise<void> };

/** How long deleting can be undone */
const UNDO_MS = 7000;

/**
 * Asks the user before something that cannot be undone, and lets deleting
 * be undone for a moment instead of asking. The dialog is the
 * ConfirmDialogComponent, the offer to undo the UndoToastComponent; both are
 * part of the page once.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dataAccess = inject(OfflineDataAccessService);
  private readonly i18n = inject(I18n);

  readonly request = signal<ConfirmRequest | null>(null);
  /** What was deleted last, as long as that can be undone */
  readonly deleted = signal<PendingDelete | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Nobody can undo anymore once the app is left
    window.addEventListener('pagehide', () => void this.finishDelete());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.finishDelete();
    });
  }

  ask(request: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
    return new Promise((resolve) => this.request.set({ ...request, resolve }));
  }

  answer(confirmed: boolean): void {
    this.request()?.resolve(confirmed);
    this.request.set(null);
  }

  /**
   * Deletes a record without asking: it disappears at once, but is only
   * deleted when the time to undo is over. Records that are still referred
   * to by others are not deleted, as those would be left incomplete.
   * @param deletedWith collections whose records `remove` deletes together
   *   with the record, so they do not stand in the way
   */
  async delete(
    record: { id: string; name: string },
    remove: () => Promise<void>,
    deletedWith: string[] = [],
  ): Promise<void> {
    const t = this.i18n.t();

    const usages = await this.dataAccess.usages(record.id, deletedWith);
    if (usages > 0) {
      await this.ask({
        title: t.cannotDeleteTitle,
        message: t.stillUsed(record.name, usages),
      });
      return;
    }

    // Only the last one can be undone
    await this.finishDelete();
    this.keepFocusInList(record.id);
    this.dataAccess.hide([record.id]);
    this.deleted.set({ ...record, remove });
    this.timer = setTimeout(() => void this.finishDelete(), UNDO_MS);
  }

  /** Brings back what was deleted last */
  undoDelete(): void {
    const deleted = this.deleted();
    if (!deleted) return;

    clearTimeout(this.timer);
    this.deleted.set(null);
    this.dataAccess.unhide([deleted.id]);
  }

  /** Really deletes what could be undone until now */
  private async finishDelete(): Promise<void> {
    const deleted = this.deleted();
    if (!deleted) return;

    clearTimeout(this.timer);
    this.deleted.set(null);
    try {
      await deleted.remove();
    } catch (error) {
      this.dataAccess.unhide([deleted.id]);
      await this.ask({
        title: this.i18n.t().deletingFailed,
        message: error instanceof Error ? error.message : '',
      });
    }
  }

  /**
   * Moves the focus from the row that is deleted to the one after it, so
   * the list can be gone on with by keyboard (see row.directive)
   */
  private keepFocusInList(id: string): void {
    const row = document.querySelector(`[data-row-id="${id}"]`);
    if (!row?.contains(document.activeElement)) return;

    const others = Array.from(
      document.querySelectorAll<HTMLElement>('[data-row]'),
    ).filter((other) => other === row || !row.contains(other));
    const index = others.indexOf(row as HTMLElement);
    (others[index + 1] ?? others[index - 1])?.focus();
  }
}
