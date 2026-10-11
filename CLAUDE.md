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
- Do not stop, restart or migrate the user's PocketBase (port 8090, `apps/pocketbase/pb_data`)
  without being asked. For testing, start a second instance with its own data folder:
  `pocketbase serve --http=127.0.0.1:8191 --dir=<temp> --migrationsDir=apps/pocketbase/pb_migrations`
  and serve `dist/apps/foody/browser` with a proxy for `/api/` (the built app uses its own
  origin as API, the dev build uses port 8090).
- Commit only when asked. Commit messages are short titles, e.g. "Medication feature".
- The user writes German; code, comments, README and commit messages are English.

## Architecture

- One route. `HomeComponent` switches the pages by `UiStore.activeForm` (`ActiveSite`), not by
  the router. `showForm()` opens a page and returns to today on close, `edit(form, id)` returns
  to the page it was opened from. Every page change recreates the page component.
- Pages whose name starts with `new-` or `edit-` are forms (`UiStore.isEditing`).
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
- The desktop layout starts at `min-width: 1024px`. The mobile layout must stay as it is unless
  the task is about it.
- Icons are inline SVG paths in `shared/icon.component.ts` (Lucide); add a path to use a new one.

## Keyboard (desktop)

- `shared/keyboard/keyboard.ts`: components call `inject(Keyboard).bind({...})` in the
  constructor; the keys work while the component exists. A handler returning false leaves the
  key to the browser. Keys typed into fields are ignored, except `Escape` and `ctrl+enter`.
- Global keys are bound in `HomeComponent` (Esc, Ctrl+Enter, arrow keys for rows, `?`) and
  `FooterNavComponent` (pages, add menu). While a form is open only Esc, Ctrl+Enter and `?` work.
- List rows get `appRow` (`rowOpen`, `rowEdit`, `rowDelete`); `data-row` alone makes an element
  reachable with the arrow keys.
- `appAutofocus` on the first field of a form; `[appAutofocus]="!editId()"` on search selects.
- Hints are `<kbd class="kbd">`, hidden below 1024px by the global styles. The line of hints
  below a page and the help window (`shortcut-help.component.ts`) are maintained by hand: a new
  key has to be added to `keyHints` in `HomeComponent` and to the help window.
- Lint rejects `(keydown)` and `(click)` on non-interactive elements in templates. Put such
  handlers on a button or in the `host` of the component.
