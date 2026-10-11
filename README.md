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
