import { inject, Injectable, signal } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { I18n } from '../i18n/i18n';

export type ConfirmRequest = {
  title: string;
  message: string;
  /** Without it the dialog only informs and has a single OK button */
  confirmLabel?: string;
  resolve: (confirmed: boolean) => void;
};

/**
 * Asks the user before something that cannot be undone. The dialog itself
 * is the ConfirmDialogComponent, which is part of the page once.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dataAccess = inject(OfflineDataAccessService);
  private readonly i18n = inject(I18n);

  readonly request = signal<ConfirmRequest | null>(null);

  ask(request: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
    return new Promise((resolve) => this.request.set({ ...request, resolve }));
  }

  answer(confirmed: boolean): void {
    this.request()?.resolve(confirmed);
    this.request.set(null);
  }

  /**
   * Deletes after the user confirmed it. Records that are still referred to
   * by others are not deleted, as those would be left incomplete.
   */
  async delete(
    record: { id: string; name: string },
    remove: () => Promise<void>,
  ): Promise<void> {
    const t = this.i18n.t();

    const usages = await this.dataAccess.usages(record.id);
    if (usages > 0) {
      await this.ask({
        title: t.cannotDeleteTitle,
        message: t.stillUsed(record.name, usages),
      });
      return;
    }

    const confirmed = await this.ask({
      title: t.deleteTitle,
      message: t.deleteMessage(record.name),
      confirmLabel: t.delete,
    });
    if (!confirmed) return;

    try {
      await remove();
    } catch (error) {
      await this.ask({
        title: t.deletingFailed,
        message: error instanceof Error ? error.message : '',
      });
    }
  }
}
