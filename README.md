# Foody

Nx workspace with an Angular frontend and a [PocketBase](https://pocketbase.io) backend.

## Project structure

| Path                     | Nx project          | Description                                                                    |
| ------------------------ | ------------------- | ------------------------------------------------------------------------------ |
| `apps/foody`             | `foody`             | Angular application                                                            |
| `apps/pocketbase`        | `pocketbase`        | PocketBase executable, migrations (`pb_migrations`) and local data (`pb_data`) |
| `libs/pocketbase-access` | `pocketbase-access` | Angular library for accessing PocketBase                                       |
| `docs`                   | -                   | Data model (`Model.af`)                                                        |

## Requirements

- Node.js (tested with v24)
- pnpm (tested with v10)
- PocketBase executable (tested with v0.38.2), see Setup

## Setup

1. Run `pnpm i` in the root folder to install the dependencies.
2. Download PocketBase for your platform from <https://pocketbase.io/docs/> and place the executable
   (`pocketbase.exe` on Windows, `pocketbase` on Linux/macOS) in `apps/pocketbase`.
   The executable and `pb_data` are not part of the repository.
3. On the first start PocketBase prints a link to create the superuser account for the dashboard.
   Alternatively run `./pocketbase superuser upsert EMAIL PASSWORD` in `apps/pocketbase`.

The collections are created automatically from `apps/pocketbase/pb_migrations` when PocketBase starts.

## Start everything

`pnpm run serve` starts PocketBase and the Angular dev server in parallel.

| Service              | URL                          |
| -------------------- | ---------------------------- |
| Angular app          | <http://localhost:4200>      |
| PocketBase REST API  | <http://127.0.0.1:8090/api/> |
| PocketBase dashboard | <http://127.0.0.1:8090/_/>   |

The PocketBase URL and port used by the app are configured in `apps/foody/src/app/app.config.ts`.

## Offline use and synchronization

The app works on a local copy of the data in the browser (IndexedDB), see
`libs/pocketbase-access/src/lib/offline`.

- New records are stored on the device first and queued. They are sent to PocketBase as soon as it
  is reachable; records of other devices are fetched at the same time.
- Synchronization runs on start, after creating a record, when the device comes back online, when
  the app becomes visible again and once a minute. The status in the header shows the state and
  triggers it manually.
- Only creating records is supported, so there are no conflicts to resolve. The same name created
  on two devices results in two records.
- The collections that are copied to the device are listed in `apps/foody/src/app/app.config.ts`.
- A device has to reach the server once before it can be used offline.
- A service worker (`apps/foody/public/sw.js`) keeps the built app on the device, so it starts
  without the server. It is not active with the dev server.

## Use on the phone (HTTPS in the home network)

Browsers only allow the service worker over HTTPS, so the built app is served by
`tools/serve-https.mjs` with a certificate of a local authority created by
[mkcert](https://github.com/FiloSottile/mkcert). The script also forwards `/api/` and `/_/` to
PocketBase, which itself stays reachable from this machine only.

One-time setup on the PC:

1. Install mkcert, e.g. `winget install FiloSottile.mkcert`.
2. `pnpm run cert` creates the certificate in `certs/` (not part of the repository). Run it again
   when the address of the PC in the network changes.
3. Optional: `mkcert -install` makes the browsers of the PC trust the certificate.
4. Allow incoming connections for the ports 8443 and 8880 in the firewall, e.g. on Windows in a
   terminal with administrator rights:
   `New-NetFirewallRule -DisplayName foody -Direction Inbound -Protocol TCP -LocalPort 8443,8880 -Action Allow`

`pnpm run serve:https` builds the app and starts PocketBase and the HTTPS server. It prints the
addresses:

| What                      | URL                                            |
| ------------------------- | ---------------------------------------------- |
| App                       | `https://<address of the PC>:8443`             |
| PocketBase dashboard      | `https://<address of the PC>:8443/_/`          |
| Certificate for the phone | `http://<address of the PC>:8880/foody-ca.crt` |

One-time setup on the phone, in the same network:

1. Open the certificate URL and download the file.
2. Android: Settings > Security > Encryption & credentials > Install a certificate > CA
   certificate. iPhone: install the downloaded profile in Settings, then enable it under General >
   About > Certificate Trust Settings.
3. Open the app URL and add it to the home screen.

The ports can be changed with the environment variables `FOODY_HTTPS_PORT` and `FOODY_HTTP_PORT`.

## Backup

`pnpm run backup` saves the database and the uploaded files to `backups/foody-<date>_<time>`. It
works while PocketBase is running and checks that the saved database can be read.

- Another folder: `pnpm run backup D:\some\folder` or the environment variable `FOODY_BACKUP_DIR`.
  Use a folder on another disk or in a cloud folder; `backups/` is on the same disk as the data.
- The newest 14 backups are kept, older ones are removed (`FOODY_BACKUP_KEEP`, `0` keeps all).
- Entries that a phone has not synchronized yet are not on the server and so not in the backup.

To restore, stop PocketBase and replace `data.db` and `storage` in `apps/pocketbase/pb_data` with
the ones of the backup (delete `data.db-shm` and `data.db-wal` there if they exist).

PocketBase can also create backups itself: dashboard > Settings > Backups.

## Languages

The user interface is available in English and German. The language is chosen in the settings of
the app; "System" follows the language of the browser.

- All texts are in `apps/foody/src/app/shared/i18n/translations.ts`. English is the reference, the
  compiler reports keys that are missing in another language.
- Components read the texts with `t().key` (see `i18n.ts`), so they change without reloading.
- Records the user creates (foods, dishes, symptoms) are not translated; they are shown as entered.
- The reference data (`amountUnitET`, `symptomTypeET`, `symptomLocationET`) has the optional
  fields `name_de` and `name_en`. The app shows the field of the current language if it is filled,
  otherwise `name`. They can be maintained in the PocketBase dashboard.

## Single commands

| Command                                      | Description                                            |
| -------------------------------------------- | ------------------------------------------------------ |
| `pnpm nx serve foody`                        | Angular dev server only                                |
| `pnpm nx serve pocketbase`                   | PocketBase only                                        |
| `pnpm nx build foody`                        | Production build to `dist/apps/foody`                  |
| `pnpm nx serve-static foody`                 | Serve the production build                             |
| `pnpm nx lint foody`                         | Lint the app                                           |
| `pnpm nx lint pocketbase-access`             | Lint the library                                       |
| `pnpm nx test pocketbase-access`             | Unit tests of the library (Vitest)                     |
| `pnpm nx run pocketbase:migrate-collections` | Create a migration snapshot of the current collections |
