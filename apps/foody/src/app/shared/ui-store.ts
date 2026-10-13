import { Location } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { isSameDay, startOfDay, toDateInputValue } from './date-utils';

export type ActiveSite =
  | 'today'
  | 'new-food-item'
  | 'new-dish'
  | 'new-meal'
  | 'new-health-entry'
  | 'new-symptom'
  | 'new-medication'
  | 'new-medication-entry'
  | 'new-follow-up'
  | 'edit-unit'
  | 'view-food'
  | 'view-dish'
  | 'view-symptom'
  | 'view-medication'
  | 'month'
  | 'report'
  | 'settings'
  | 'lists';

type Page = {
  form: ActiveSite;
  /** The record that is shown or changed */
  id: string | null;
  /** The record a new one starts as a copy of */
  copyId?: string | null;
  day?: Date;
  /** The forms opened from the form, see `nested` */
  nested?: string[];
};

/** The pages without a record, with their address */
const PLAIN: Partial<Record<ActiveSite, string>> = {
  month: 'month',
  report: 'report',
  lists: 'lists',
  settings: 'settings',
};
/**
 * The forms: `<name>/new` creates a record, `<name>/<id>/edit` changes it
 * and `<name>/<id>/copy` creates one that starts as a copy
 */
const FORMS: Partial<Record<ActiveSite, string>> = {
  'new-meal': 'meal',
  'new-health-entry': 'symptom-entry',
  'new-medication-entry': 'medication-entry',
  'new-food-item': 'food',
  'new-dish': 'dish',
  'new-symptom': 'symptom',
  'new-medication': 'medication',
  'edit-unit': 'unit',
};
/** The details of a record: `<name>/<id>` */
const VIEWS: Partial<Record<ActiveSite, string>> = {
  'view-food': 'food',
  'view-dish': 'dish',
  'view-symptom': 'symptom',
  'view-medication': 'medication',
};
/** A follow-up is added to a symptom entry: `symptom-entry/<id>/follow-up` */
const FOLLOW_UP = 'follow-up';
const DAY = 'day';
/** The forms opened from a form, e.g. `?with=dish,dish-food` */
const NESTED = 'with';

function siteOf(
  names: Partial<Record<ActiveSite, string>>,
  name: string,
): ActiveSite | undefined {
  return (Object.keys(names) as ActiveSite[]).find(
    (site) => names[site] === name,
  );
}

/** Whether a page is a form, which input can get lost by leaving */
function isForm(site: ActiveSite): boolean {
  return /^(new|edit)-/.test(site);
}

/** The address without what follows the path */
export function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}

/** The address of a page; the day view of today is the start page */
function toUrl({ form, id, copyId, day, nested }: Page): string {
  const path = () => {
    if (form === 'today') {
      return !day || isSameDay(day, new Date())
        ? '/'
        : `/${DAY}/${toDateInputValue(day)}`;
    }
    if (form === 'new-follow-up') {
      return `/${FORMS['new-health-entry']}/${id}/${FOLLOW_UP}`;
    }
    if (PLAIN[form]) return `/${PLAIN[form]}`;
    if (VIEWS[form]) return `/${VIEWS[form]}/${id}`;
    if (copyId) return `/${FORMS[form]}/${copyId}/copy`;
    return id ? `/${FORMS[form]}/${id}/edit` : `/${FORMS[form]}/new`;
  };
  return nested?.length
    ? `${path()}?${NESTED}=${nested.map(encodeURIComponent).join(',')}`
    : path();
}

/** The page of an address, or null if there is no such page */
function toPage(url: string): Page | null {
  const page = toPageOfPath(pathOf(url));
  if (!page) return null;

  const query = new URLSearchParams(url.split('#')[0].split('?')[1] ?? '');
  const nested = (query.get(NESTED) ?? '').split(',').filter(Boolean);
  return { ...page, nested };
}

function toPageOfPath(path: string): Page | null {
  const [name, second, third, ...rest] = path
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  if (rest.length > 0) return null;

  if (!name) return { form: 'today', id: null, day: new Date() };
  if (name === DAY) {
    const day = new Date(`${second}T00:00`);
    return /^\d{4}-\d{2}-\d{2}$/.test(second ?? '') &&
      !third &&
      !isNaN(day.getTime())
      ? { form: 'today', id: null, day }
      : null;
  }
  if (!second) {
    const form = siteOf(PLAIN, name);
    return form ? { form, id: null } : null;
  }

  const form = siteOf(FORMS, name);
  if (form && second === 'new' && !third) return { form, id: null };
  if (form && third === 'edit') return { form, id: second };
  if (form && third === 'copy') return { form, id: null, copyId: second };
  if (form === 'new-health-entry' && third === FOLLOW_UP) {
    return { form: 'new-follow-up', id: second };
  }
  const view = siteOf(VIEWS, name);
  return view && !third ? { form: view, id: second } : null;
}

/**
 * Which page is shown. The address of the browser is the source: opening a
 * page navigates, and the state follows every navigation, so the back button
 * and links to a page work.
 */
@Injectable({ providedIn: 'root' })
export class UiStore {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly activeForm = signal<ActiveSite>('today');
  /** The record the active form changes; null if it creates a new one */
  readonly editId = signal<string | null>(null);
  /** The record the new one of the active form starts as a copy of */
  readonly copyId = signal<string | null>(null);
  /** The day the day view shows and new entries are logged for */
  readonly selectedDay = signal(startOfDay(new Date()));
  /**
   * The forms that are shown in place of the form they were opened from,
   * e.g. the one for a new symptom while logging a symptom; the last one is
   * the one on top. They are part of the address, so the back button closes
   * them one by one.
   */
  readonly nested = signal<string[]>([]);
  /** Changes whenever another page is opened */
  private readonly pageKey = signal('');
  /** The path of the address that is shown */
  private path = '';

  /**
   * The form has input that is not saved. Leaving it asks first, see
   * `confirmLeaving`.
   */
  readonly isDirty = signal(false);
  /**
   * The row that gets the focus when its list is shown again, e.g. the entry
   * that was just edited (see row.directive)
   */
  readonly focusRowId = signal<string | null>(null);
  /** The row that gets the focus once the form that is open is left */
  private pendingFocusId: string | null = null;

  /**
   * The page a form was opened from. Wide screens show the form at its side
   * and the page behind it, which is the day view if the form was opened by
   * its address.
   */
  readonly background = signal<{
    key: string;
    form: ActiveSite;
    editId: string | null;
    copyId: string | null;
  }>({ key: 'today', form: 'today', editId: null, copyId: null });
  private backgroundPath = '/';

  /**
   * The page that is shown. Its key changes whenever a page is opened, so a
   * form always starts fresh, even if the same form was open before.
   */
  readonly page = computed(() => ({
    key: this.pageKey(),
    form: this.activeForm(),
    editId: this.editId(),
    copyId: this.copyId(),
  }));

  /** A form is open, which entered data would be lost by leaving */
  readonly isEditing = computed(() => isForm(this.activeForm()));

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.show(event.urlAfterRedirects, event.id);
      }
    });
    // The first navigation may be over already
    this.show(this.location.path(), 0);

    // Closing or reloading the app would lose the input as well
    window.addEventListener('beforeunload', (event) => {
      if (this.isDirty()) event.preventDefault();
    });
  }

  showForm(form: ActiveSite): void {
    if (form === 'today') this.showDay(this.selectedDay());
    else this.open({ form, id: null });
  }

  /** Opens the form or the details of a record */
  edit(form: ActiveSite, id: string): void {
    this.pendingFocusId = id;
    this.open({ form, id });
  }

  /** Opens the form for a new record that starts as a copy of a record */
  copy(form: ActiveSite, id: string): void {
    this.open({ form, id: null, copyId: id });
  }

  /** Leaves a form or the details: back to where they were opened from */
  close(): void {
    this.back('/');
  }

  /**
   * Leaves a form whose input was saved
   * @param id the record that was saved, whose row gets the focus
   */
  done(id?: string): void {
    this.isDirty.set(false);
    if (id) this.pendingFocusId = id;
    this.close();
  }

  /** Whether the form is shown in place of the form it was opened from */
  isNested(name: string): boolean {
    return this.nested().includes(name);
  }

  /** Shows a form in place of the current one, see `nested` */
  openNested(name: string): void {
    this.open({ ...this.current(), nested: [...this.nested(), name] });
  }

  /** Closes the form that was opened last in place of another */
  closeNested(): void {
    if (this.nested().length === 0) return;
    this.back(toUrl({ ...this.current(), nested: this.nested().slice(0, -1) }));
  }

  /**
   * Shows what was logged on a day
   * @param replace instead of a step back to the day shown before, e.g.
   *   when paging through the days
   */
  showDay(day: Date, replace = false): void {
    // Also if the address stays, e.g. the start page on the next morning
    this.selectDay(day);
    this.open({ form: 'today', id: null, day }, replace);
  }

  /** Shows today */
  goHome(): void {
    this.showDay(new Date());
  }

  isActive(activeForm: ActiveSite): boolean {
    return this.activeForm() === activeForm;
  }

  private selectDay(day: Date): void {
    if (!isSameDay(day, this.selectedDay())) {
      this.selectedDay.set(startOfDay(day));
    }
  }

  private current(): Page {
    return {
      form: this.activeForm(),
      id: this.editId(),
      copyId: this.copyId(),
      day: this.selectedDay(),
    };
  }

  private open(page: Page, replaceUrl = false): void {
    void this.router.navigateByUrl(toUrl(page), { replaceUrl });
  }

  /**
   * One step back
   * @param fallback where to go if the page was opened by its address, so
   *   there is no page of the app to go back to
   */
  private back(fallback: string): void {
    if (this.canGoBack()) this.location.back();
    else void this.router.navigateByUrl(fallback, { replaceUrl: true });
  }

  /** Whether the page before this one is a page of the app */
  private canGoBack(): boolean {
    // Knows it also after a reload, where the router starts counting anew
    const { navigation } = window as { navigation?: { canGoBack?: boolean } };
    if (typeof navigation?.canGoBack === 'boolean') return navigation.canGoBack;

    // Browsers without it: the router numbers its navigations
    const state = this.location.getState() as { navigationId?: number } | null;
    return (state?.navigationId ?? 1) > 1;
  }

  /** Takes over the page of an address */
  private show(url: string, navigationId: number): void {
    const page = toPage(url);
    if (!page) {
      // An address that does not exist leads to the start page
      void this.router.navigateByUrl('/', { replaceUrl: true });
      return;
    }

    // Only a form was opened or closed in place of the form that is shown
    const isSamePage =
      page.form !== 'today' &&
      this.pageKey() !== '' &&
      pathOf(url) === this.path;
    this.path = pathOf(url);
    this.nested.set(page.nested ?? []);
    if (isSamePage) return;

    if (page.day) this.selectDay(page.day);
    this.isDirty.set(false);
    this.editId.set(page.id);
    this.copyId.set(page.copyId ?? null);
    // The day view stays while its day changes; anything else starts fresh
    let key = page.form === 'today' ? 'today' : `${navigationId}`;
    if (!isForm(page.form)) {
      // Back from a form, the page it was opened from is still there
      const isBack = this.isEditing() && this.path === this.backgroundPath;
      if (isBack) key = this.background().key;
      this.backgroundPath = this.path;
      this.background.set({
        key,
        form: page.form,
        editId: page.id,
        copyId: null,
      });
      // Its row of the record that was edited or created gets the focus
      this.focusRowId.set(this.pendingFocusId);
      this.pendingFocusId = null;
    }
    this.activeForm.set(page.form);
    this.pageKey.set(key);
  }
}
