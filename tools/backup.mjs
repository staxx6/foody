// Backs up the PocketBase data into one ZIP file: the database and the
// uploaded files. Works while PocketBase is running.
//
//   pnpm run backup [target folder]
//
// The target folder can also be set with FOODY_BACKUP_DIR; the number of
// backups that are kept with FOODY_BACKUP_KEEP (default 14).
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { filesIn, nameIn, readZip, writeZip } from './zip.mjs';

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

// e.g. foody-2026-10-11_133438.zip, sorts by time
const stamp = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 19)
  .replace('T', '_')
  .replaceAll(':', '');
const backupFile = join(targetDir, `${PREFIX}${stamp}.zip`);
mkdirSync(targetDir, { recursive: true });
const workDir = mkdtempSync(join(tmpdir(), 'foody-backup-'));

try {
  // A plain copy of the file could catch the database in the middle of a
  // write; the backup function of SQLite gives a consistent state
  const database = join(workDir, 'data.db');
  const source = new DatabaseSync(join(dataDir, 'data.db'), { readOnly: true });
  await backup(source, database);
  source.close();

  // Only a backup that can be read is worth keeping
  const copy = new DatabaseSync(database, { readOnly: true });
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
  if (integrity !== 'ok')
    throw new Error(`The database is damaged (${integrity})`);

  const storage = join(dataDir, 'storage');
  const entries = [
    { path: database, name: 'data.db' },
    ...(existsSync(storage)
      ? filesIn(storage).map((path) => ({
          path,
          name: `storage/${nameIn(storage, path)}`,
        }))
      : []),
  ];

  // Under its final name only once it is complete and can be read back
  const partial = `${backupFile}.partial`;
  writeZip(partial, entries);
  const written = readZip(partial);
  if (written.get('data.db')?.length !== statSync(database).size) {
    throw new Error('The database is missing in the ZIP file');
  }
  renameSync(partial, backupFile);

  // Older backups were folders; they count and are removed the same way
  const backups = readdirSync(targetDir)
    .filter((name) => name.startsWith(PREFIX) && !name.endsWith('.partial'))
    .sort();
  const outdated = keep > 0 ? backups.slice(0, -keep) : [];
  for (const name of outdated) {
    rmSync(join(targetDir, name), { recursive: true });
  }

  const size = (statSync(backupFile).size / 1024 / 1024).toFixed(1);
  console.log(
    `Backup created: ${backupFile} (${size} MB, ${entries.length} files)`,
  );
  console.log(`Records: ${collections.join(', ')}`);
  console.log(
    `Backups kept: ${backups.length - outdated.length}` +
      (outdated.length ? ` (${outdated.length} old removed)` : ''),
  );
} catch (error) {
  rmSync(`${backupFile}.partial`, { force: true });
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
