// Backs up the PocketBase data: the database and the uploaded files.
// Works while PocketBase is running.
//
//   pnpm run backup [target folder]
//
// The target folder can also be set with FOODY_BACKUP_DIR; the number of
// backups that are kept with FOODY_BACKUP_KEEP (default 14).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

const root = join(import.meta.dirname, '..');
const dataDir = join(root, 'apps', 'pocketbase', 'pb_data');
const targetDir = resolve(
  process.argv[2] ?? process.env.FOODY_BACKUP_DIR ?? join(root, 'backups'),
);
const keep = Number(process.env.FOODY_BACKUP_KEEP ?? 14);
const PREFIX = 'foody-';

if (!existsSync(join(dataDir, 'data.db'))) {
  console.error(`No database found in ${dataDir}`);
  process.exit(1);
}

// e.g. foody-2026-10-11_133438, sorts by time
const stamp = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 19)
  .replace('T', '_')
  .replaceAll(':', '');
const backupDir = join(targetDir, PREFIX + stamp);
mkdirSync(backupDir, { recursive: true });

// A plain copy of the file could catch the database in the middle of a
// write; the backup function of SQLite gives a consistent state
const source = new DatabaseSync(join(dataDir, 'data.db'), { readOnly: true });
await backup(source, join(backupDir, 'data.db'));
source.close();

if (existsSync(join(dataDir, 'storage'))) {
  cpSync(join(dataDir, 'storage'), join(backupDir, 'storage'), {
    recursive: true,
  });
}

// Only a backup that can be read is worth keeping
const copy = new DatabaseSync(join(backupDir, 'data.db'), { readOnly: true });
const [{ integrity_check: integrity }] = copy
  .prepare('PRAGMA integrity_check')
  .all();
const collections = copy
  .prepare("SELECT name FROM _collections WHERE system = 0 AND type = 'base'")
  .all()
  .map(({ name }) => {
    const { count } = copy
      .prepare(`SELECT count(*) AS count FROM "${name}"`)
      .get();
    return `${name}: ${count}`;
  });
copy.close();
// Reading it left the (empty) helper files of SQLite behind
for (const suffix of ['-shm', '-wal']) {
  rmSync(join(backupDir, `data.db${suffix}`), { force: true });
}

if (integrity !== 'ok') {
  console.error(`The backup is damaged (${integrity}): ${backupDir}`);
  process.exit(1);
}

const backups = readdirSync(targetDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith(PREFIX))
  .map((entry) => entry.name)
  .sort();
const outdated = keep > 0 ? backups.slice(0, -keep) : [];
for (const name of outdated) {
  rmSync(join(targetDir, name), { recursive: true });
}

console.log(`Backup created: ${backupDir}`);
console.log(`Records: ${collections.join(', ')}`);
console.log(
  `Backups kept: ${backups.length - outdated.length}` +
    (outdated.length ? ` (${outdated.length} old removed)` : ''),
);
