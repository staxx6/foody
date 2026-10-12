import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { I18n } from '../i18n/i18n';
import { pathOf, UiStore } from '../ui-store';
import { ConfirmService } from './confirm.service';

/**
 * Asks before a form with input that is not saved is left, be it by a
 * button, a key or the back button of the browser
 */
export const confirmLeaving: CanActivateFn = (_route, state) => {
  const uiStore = inject(UiStore);
  const t = inject(I18n).t();

  // A form shown in place of the form keeps its input, see UiStore.nested
  const staysOnPage = pathOf(state.url) === pathOf(inject(Router).url);
  if (!uiStore.isDirty() || staysOnPage) return true;

  return inject(ConfirmService).ask({
    title: t.discardTitle,
    message: t.discardMessage,
    confirmLabel: t.discard,
    cancelLabel: t.keepEditing,
  });
};
