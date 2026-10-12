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

type Page = { form: ActiveSite; id: string | null; day?: Date };

/** The pages without a record, with their address */
const PLAIN: Partial<Record<ActiveSite, string>> = {
  month: 'month',
  report: 'report',
  lists: 'lists',
  settings: 'settings',
};
/** The forms: `<name>/new` creates a record, `<name>/<id>/edit` changes it */
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

function siteOf(
  names: Partial<Record<ActiveSite, string>>,
  name: string,
): ActiveSite | undefined {
  return (Object.keys(names) as ActiveSite[]).find(
    (site) => names[site] === name,
  );
}

/** The address of a page; the day view of today is the start page */
function toUrl({ form, id, day }: Page): string {
  if (form === 'today') {
    return !day || isSameDay(day, new Date())
      ? '/'
      : `/${DAY}/${toDateInputValue(day)}`;
  }
  if (form === 'new-follow-up')
    return `/${FORMS['new-health-entry']}/${id}/${FOLLOW_UP}`;
  if (PLAIN[form]) return `/${PLAIN[form]}`;
  if (VIEWS[form]) return `/${VIEWS[form]}/${id}`;
  return id ? `/${FORMS[form]}/${id}/edit` : `/${FORMS[form]}/new`;
}

/** The page of an address, or null if there is no such page */
function toPage(url: string): Page | null {
  const [name, second, third, ...rest] = url
    .split(/[?#]/)[0]
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
  /** The day the day view shows and new entries are logged for */
  readonly selectedDay = signal(startOfDay(new Date()));
  /** Changes whenever another page is opened */
  private readonly pageKey = signal('');

  /**
   * The page that is shown. Its key changes whenever a page is opened, so a
   * form always starts fresh, even if the same form was open before.
   */
  readonly page = computed(() => ({
    key: this.pageKey(),
    form: this.activeForm(),
    editId: this.editId(),
  }));

  /** A form is open, which entered data would be lost by leaving */
  readonly isEditing = computed(() => /^(new|edit)-/.test(this.activeForm()));

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.show(event.urlAfterRedirects, event.id);
      }
    });
    // The first navigation may be over already
    this.show(this.location.path(), 0);
  }

  showForm(form: ActiveSite): void {
    if (form === 'today') this.showDay(this.selectedDay());
    else this.open({ form, id: null });
  }

  /** Opens the form or the details of a record */
  edit(form: ActiveSite, id: string): void {
    this.open({ form, id });
  }

  /** Leaves a form or the details: back to where they were opened from */
  close(): void {
    // Opened by its address, there is no page of the app to go back to
    if (this.canGoBack()) this.location.back();
    else void this.router.navigateByUrl('/', { replaceUrl: true });
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

  private selectDay(day: Date): void {
    if (!isSameDay(day, this.selectedDay())) {
      this.selectedDay.set(startOfDay(day));
    }
  }

  /** Shows today */
  goHome(): void {
    this.showDay(new Date());
  }

  isActive(activeForm: ActiveSite): boolean {
    return this.activeForm() === activeForm;
  }

  private open(page: Page, replaceUrl = false): void {
    void this.router.navigateByUrl(toUrl(page), { replaceUrl });
  }

  /** Takes over the page of an address */
  private show(url: string, navigationId: number): void {
    const page = toPage(url);
    if (!page) {
      // An address that does not exist leads to the start page
      void this.router.navigateByUrl('/', { replaceUrl: true });
      return;
    }

    if (page.day) this.selectDay(page.day);
    this.editId.set(page.id);
    this.activeForm.set(page.form);
    // The day view stays while its day changes; anything else starts fresh
    this.pageKey.set(page.form === 'today' ? 'today' : `${navigationId}`);
  }
}
