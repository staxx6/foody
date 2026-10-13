# Foody

Food and symptom diary: Angular app (`apps/foody`), PocketBase backend (`apps/pocketbase`),
data access library with offline copy (`libs/pocketbase-access`). Setup, offline behaviour,
HTTPS and backup are described in `README.md`; do not repeat them here.

## Commands

| What                    | Command                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| Build, lint, test (all) | `pnpm nx run-many -t build lint test`                                  |
| Format changed files    | `pnpm exec prettier --write "apps/foody/src/**/*.{ts,scss}" README.md` |
| App + PocketBase        | `pnpm run serve` (app on 4200, PocketBase on 8090)                     |

- Only the library has unit tests (Vitest). The app has none; verify UI changes in a browser.
- There is no Python on this machine; use Node or the shell for scripts.

## Working here

- The user usually has `pnpm run serve` running. The dev server hot-reloads every edit, so a
  half-finished change is visible to them at once.
- The dev server can get stuck on an old state after files were changed by `sed -i` or copied
  over: it then reports errors that the production build does not have, or serves old code.
  After such changes, check `http://localhost:4200/main.js` for something new and restart the
  dev server if it is missing.
- Do not stop, restart or migrate the user's PocketBase (port 8090, `apps/pocketbase/pb_data`)
  without being asked. For testing, start a second instance with its own data folder:
  `pocketbase serve --http=127.0.0.1:8191 --dir=<temp> --migrationsDir=apps/pocketbase/pb_migrations`
  and serve `dist/apps/foody/browser` with a proxy for `/api/` (the built app uses its own
  origin as API, the dev build uses port 8090).
- Commit only when asked. Commit messages are short titles, e.g. "Medication feature".
- The user writes German; code, comments, README and commit messages are English.

## Architecture

- One wildcard route. `HomeComponent` switches the pages by `UiStore.activeForm` (`ActiveSite`).
  The address is the source of the state: `UiStore` (`shared/ui-store.ts`) maps every page to
  an address (`/month`, `/meal/new`, `/food/<id>/edit`, `/day/2026-10-11`, ...), its methods
  navigate, and it reads the page from every navigation. A new page needs an entry in the
  tables there, or its address leads to the start page.
- `close()` is the back button of the browser, so a form returns to where it was opened from.
  Paging through days replaces the address instead of adding steps to go back.
- Every page change recreates the page component, except the day view when its day changes.
- Wide screens show a form in a panel at the side (`.side-panel` in `HomeComponent`) and keep
  the page it was opened from (`UiStore.background`) behind it; small screens show the form
  instead of the page. The page behind is not recreated when the form closes, so whatever shows
  data has to reload on `sync.revision()`, which also increases on every local change. Keys
  bound by the page behind do not work while the panel is open.
- The day view shows its entries as one timeline (`day-timeline.component.ts`) or as a list per
  kind, chosen in `SettingsStore.dayView`. Both use the same rows: `li[appMealRow]`,
  `li[appSymptomRow]`, `li[appMedicationRow]`, which own the menu and the actions of an entry.
- Forms shown in place of another form (a new symptom while logging one, a follow-up while
  editing an entry) are part of the address as `?with=<name>`: `UiStore.openNested()`,
  `closeNested()`, `isNested()`. The outer form stays alive and keeps its input. A name must be
  unique along a chain of forms (the dish form uses `dish-food`, as it can itself be nested).
- Pages whose name starts with `new-` or `edit-` are forms (`UiStore.isEditing`).
- Input in a form sets `UiStore.isDirty` (noticed by `HomeComponent` from `input`/`change`
  events; own controls have to dispatch a bubbling `change`). Leaving a dirty form asks first
  (`confirm-leaving.ts`, a guard that runs on every navigation). A form that saved calls
  `uiStore.done(id)` instead of `close()`, which also gives the focus to the row of that record.
- Deleting does not ask: `ConfirmService.delete` hides the record in the offline copy and only
  deletes it when the time to undo is over. Lists have to reload on `sync.revision()`, or they
  neither lose the record nor get it back on undo.
- A discomfort level is stored as 1-100 but entered and shown in ten steps
  (`shared/level.component.ts`); never show the stored number. Its color is always the one
  scale of `--discomfort` in the global styles, also in the month view and the week strip.
- Stores are NgRx signal stores or services with signals, one per collection, next to their
  components. They use `DATA_ACCESS`, which is the offline copy (`OfflineDataAccessService`):
  `list` only filters by a date range, everything else is filtered in memory.
- Change detection is zoneless: the DOM updates shortly after a signal changes, not
  synchronously. Fields that are not signals need `ChangeDetectorRef.markForCheck()` after
  async loading. Browser tests have to wait after an input.
- Components are standalone with inline template and styles, one file each.

## Adding a collection

1. Migration in `apps/pocketbase/pb_migrations` (`<timestamp>_<what>.js`, timestamp higher than
   the newest one). Rules are open (`""`), as the server is only reachable at home.
2. Add it to `collections` in `apps/foody/src/app/app.config.ts`, or it is not synchronized.
3. PocketBase applies migrations only on start. Until it is restarted, the app shows a sync
   problem and requests fail with 404 "Missing collection context". Tell the user to restart.
4. PocketBase stores "no value" of a number as 0; read with `Number(x) || null`.
5. Records that refer to a record block deleting it (`ConfirmService.delete`). Records that are
   deleted together with it are passed as `deletedWith`, see the symptom follow-ups.

## Conventions

- All texts are in `shared/i18n/translations.ts`, read with `t().key`. English is the reference;
  German must have the same keys, the compiler checks it.
- Comments say why, in short sentences without a full stop at the end; `/** */` on members.
  Match the comment density of the file.
- Styles: design tokens and shared classes (`.card`, `.entry`, `.chip`, `.icon-btn`, forms) are
  in `apps/foody/src/styles.scss`. Global classes also apply inside components, so a local class
  with the same name inherits them (e.g. `.entry`).
- Fields of forms are filled with `--field` and have no visible border, to keep forms from
  being all lines. A panel that groups fields is tinted (`--bg`) and sets `--field` to
  `--surface`, so its fields stand out from it (see the meal form). Do not outline fields.
- A search select whose options can be created gets `[createLabel]` and `(create)`: a plus in
  the field and a last option in its list. No link below the field for it.
- The desktop layout starts at `min-width: 1024px`. The mobile layout must stay as it is unless
  the task is about it.
- Icons are inline SVG paths in `shared/icon.component.ts` (Lucide); add a path to use a new one.

## Keyboard (desktop)

- `shared/keyboard/keyboard.ts`: components call `inject(Keyboard).bind({...})` in the
  constructor; the keys work while the component exists. A handler returning false leaves the
  key to the browser. Keys typed into fields are ignored, except `Escape` and `ctrl+enter`.
- Global keys are bound in `HomeComponent` (Esc, Ctrl+Enter, arrow keys for rows, `?`) and
  `FooterNavComponent` (pages, add menu). While a form is open only Esc, Ctrl+Enter and `?` work.
- List rows get `appRow` (`rowOpen`, `rowEdit`, `rowCopy`, `rowDelete`, `rowClick`) and
  `[rowId]`, the id of their record, which the focus handling relies on; `data-row` alone makes
  an element reachable with the arrow keys.
- The entries of the day view and the lists have no buttons but one menu
  (`shared/entry-menu.component.ts`),
  opened by a click on the row, its three dots or Enter. A new action of an entry goes into
  the `actions()` of its list, not into the row as another icon.
- A symptom entry and its follow-ups are one unit: the day view shows the follow-ups as part of
  the entry, they are changed in the form of the entry (`new-health-entry-form`), which shows
  the follow-up form in place of itself, like the forms that create a missing option.
- `appAutofocus` on the first field of a form; only for new records on search selects, as the
  focus opens their list.
- Hints are `<kbd class="kbd">`, hidden below 1024px by the global styles. The line of hints
  below a page and the help window (`shortcut-help.component.ts`) are maintained by hand: a new
  key has to be added to `keyHints` in `HomeComponent` and to the help window.
- Lint rejects `(keydown)` and `(click)` on non-interactive elements in templates. Put such
  handlers on a button or in the `host` of the component.
