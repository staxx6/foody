import { inject, Injectable, signal } from '@angular/core';
import {
  CreateQuery,
  DataAccess,
  DataRecord,
  DateRange,
  DeleteQuery,
  GetQuery,
  ListQuery,
  UpdateQuery,
} from '../data-access.model';
import { DATA_ACCESS_CONFIG } from '../data-access.token';
import { PocketbaseAccessService } from '../pocketbase-access/pocketbase-access';
import { OFFLINE_STORAGE, OutboxItem } from './offline-storage';

const AUTO_SYNC_INTERVAL_MS = 60_000;
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 15;

/**
 * Id in the format PocketBase generates itself. Creating it on the device
 * makes sending a record repeatable without creating it twice.
 */
function generateId(): string {
  const random = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(random, (n) => ID_ALPHABET[n % ID_ALPHABET.length]).join(
    '',
  );
}

const isFile = (value: unknown) =>
  typeof Blob !== 'undefined' && value instanceof Blob;

/**
 * Files only become file names once the server stored them. Until then the
 * local copy of the record has none; the files wait in the queue.
 */
function withoutFiles(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([field, value]) => {
      if (isFile(value)) return [field, ''];
      if (Array.isArray(value) && value.some(isFile)) return [field, []];
      return [field, value];
    }),
  );
}

/**
 * What an update changes in the local copy. Files are sent with the keys
 * `field+` (add) and `field-` (remove by name), as PocketBase expects it.
 */
function localChanges(
  current: DataRecord,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.endsWith('-')) {
      const field = key.slice(0, -1);
      const removed = value as string[];
      changes[field] = ((current[field] as string[] | undefined) ?? []).filter(
        (name) => !removed.includes(name),
      );
    } else if (!key.endsWith('+')) {
      // New files only get their names from the server
      const hasFile =
        isFile(value) || (Array.isArray(value) && value.some(isFile));
      if (!hasFile) changes[key] = value;
    }
  }
  return changes;
}

/** Applies an update to the data of a record that is not created yet */
function mergeIntoCreate(
  created: Record<string, unknown>,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...created };
  for (const [key, value] of Object.entries(data)) {
    if (key.endsWith('+')) {
      const field = key.slice(0, -1);
      merged[field] = [
        ...((merged[field] as unknown[] | undefined) ?? []),
        ...(value as unknown[]),
      ];
    } else if (!key.endsWith('-')) {
      merged[key] = value;
    }
  }
  return merged;
}

function toDate(value: unknown): Date {
  // PocketBase separates date and time with a space
  return new Date(String(value).replace(' ', 'T'));
}

type RequestError = {
  status?: number;
  response?: { data?: Record<string, { code?: string }> };
};

/**
 * The server was not reached (offline, timeout, other network) or the proxy
 * in front of it reports that it is not running
 */
function isNetworkError(error: unknown): boolean {
  const status = (error as RequestError)?.status;
  return !status || (status >= 502 && status <= 504);
}

/** The record is already gone, e.g. deleted by another device */
function isNotFound(error: unknown): boolean {
  return (error as RequestError)?.status === 404;
}

/** The record was already created by an earlier attempt */
function isAlreadyCreated(error: unknown): boolean {
  const { status, response } = (error ?? {}) as RequestError;
  return (
    status === 400 && response?.data?.['id']?.code === 'validation_not_unique'
  );
}

/**
 * Works on a local copy of the data, so the app can be used without the
 * server. New records are queued and sent when the server is reachable;
 * records of other devices are fetched at the same time.
 *
 * If two devices change the same record, the change that reaches the
 * server last wins.
 */
@Injectable({ providedIn: 'root' })
export class OfflineDataAccessService implements DataAccess {
  private readonly remote = inject(PocketbaseAccessService);
  private readonly storage = inject(OFFLINE_STORAGE);
  private readonly collections = inject(DATA_ACCESS_CONFIG).collections ?? [];

  private readonly records = new Map<string, DataRecord>();
  private outbox: OutboxItem[] = [];
  private running: Promise<void> | null = null;
  private rerun = false;

  /** Records created on this device that are not on the server yet */
  readonly pendingCount = signal(0);
  readonly isSyncing = signal(false);
  /** Whether the server was reached by the last synchronization */
  readonly isOnline = signal(true);
  readonly lastSyncedAt = signal<Date | null>(null);
  /** The server rejected a record, e.g. because of invalid data */
  readonly syncError = signal<string | null>(null);
  /** Increases whenever what the local copy shows changed without the app */
  readonly revision = signal(0);

  /** Records that are treated as deleted, see `hide` */
  private readonly hidden = new Set<string>();

  private readonly ready = this.init();

  private async init(): Promise<void> {
    const snapshot = await this.storage.load();
    snapshot.records.forEach((record) => this.records.set(record.id, record));
    this.outbox = snapshot.outbox.sort((a, b) => a.seq - b.seq);
    this.pendingCount.set(this.outbox.length);
    if (snapshot.lastSyncedAt) {
      this.lastSyncedAt.set(new Date(snapshot.lastSyncedAt));
    }

    const firstSync = this.startSync();
    // Without a local copy there is nothing to show yet
    if (!snapshot.lastSyncedAt) await firstSync;
  }

  /**
   * Synchronizes when the device comes back online, the app is opened
   * again and regularly in between
   */
  startAutoSync(): void {
    window.addEventListener('online', () => void this.sync());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.sync();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') void this.sync();
    }, AUTO_SYNC_INTERVAL_MS);
  }

  async list<T>({ collectionName, options, map }: ListQuery<T>): Promise<T[]> {
    await this.ready;

    let records = [...this.records.values()].filter(
      (record) =>
        record['collectionName'] === collectionName &&
        !this.hidden.has(record.id),
    );
    if (records.length === 0 && !this.lastSyncedAt()) {
      throw new Error(
        'No data on this device yet. Connect to the server once to load it.',
      );
    }

    if (options?.dateRange) {
      records = records.filter((record) =>
        this.isInRange(record, options.dateRange as DateRange),
      );
    }
    if (options?.sort) records.sort(this.comparator(options.sort));

    const paths = options?.expand?.split(',').map((path) => path.trim()) ?? [];
    return records.map((record) => map(this.expand(record, paths)));
  }

  async create<T>({ collectionName, data, map }: CreateQuery<T>): Promise<T> {
    await this.ready;

    const id = generateId();
    const now = new Date().toISOString().replace('T', ' ');
    const record: DataRecord = {
      ...withoutFiles(data),
      id,
      collectionName,
      created: now,
      updated: now,
    };
    const item = await this.storage.addLocal(record, {
      collectionName,
      data: { ...data, id },
    });
    this.records.set(id, record);
    this.outbox.push(item);
    this.pendingCount.set(this.outbox.length);

    void this.sync();
    return map(record);
  }

  async getOne<T>({
    collectionName,
    id,
    expand,
    map,
  }: GetQuery<T>): Promise<T | null> {
    await this.ready;

    const record = this.records.get(id);
    if (record?.['collectionName'] !== collectionName) return null;
    if (this.hidden.has(id)) return null;
    const paths = expand?.split(',').map((path) => path.trim()) ?? [];
    return map(this.expand(record, paths));
  }

  /**
   * Changes fields of a record. If two devices change the same record, the
   * change that reaches the server last wins.
   */
  async update<T>({
    collectionName,
    id,
    data,
    map,
  }: UpdateQuery<T>): Promise<T> {
    await this.ready;

    const current = this.records.get(id);
    if (!current) throw new Error('The record does not exist anymore.');
    const record: DataRecord = {
      ...current,
      ...localChanges(current, data),
      updated: new Date().toISOString().replace('T', ' '),
    };

    // A record the server does not know yet is simply created changed,
    // unless it is being sent right now
    const unsentCreate =
      this.running === null
        ? this.outbox.find(
            (item) => !item.delete && !item.update && item.data.id === id,
          )
        : undefined;

    if (unsentCreate) {
      const changed: OutboxItem = {
        ...unsentCreate,
        data: { ...mergeIntoCreate(unsentCreate.data, data), id },
      };
      await this.storage.updateLocal(record, changed, null);
      this.outbox = this.outbox.map((item) =>
        item === unsentCreate ? changed : item,
      );
    } else {
      const added = await this.storage.updateLocal(record, null, {
        collectionName,
        data: { ...data, id },
        update: true,
      });
      if (added) this.outbox.push(added);
    }
    this.records.set(id, record);
    this.pendingCount.set(this.outbox.length);

    void this.sync();
    return map(record);
  }

  async delete({ collectionName, id }: DeleteQuery): Promise<void> {
    await this.ready;

    // What is still queued for the record is not worth sending anymore. A
    // record the server never got does not have to be deleted there, unless
    // it is being sent right now.
    const unsent = this.outbox.filter(
      (item) => !item.delete && item.data.id === id,
    );
    const isKnownToServer =
      unsent.every((item) => item.update) || this.running !== null;

    const added = await this.storage.deleteLocal(
      id,
      unsent.map((item) => item.seq),
      isKnownToServer ? [{ collectionName, data: { id }, delete: true }] : [],
    );
    this.records.delete(id);
    this.hidden.delete(id);
    this.outbox = [
      ...this.outbox.filter((item) => !unsent.includes(item)),
      ...added,
    ];
    this.pendingCount.set(this.outbox.length);

    void this.sync();
  }

  /**
   * How many records of the local copy refer to the record, e.g. the
   * entries of a food. Deleting it would leave them without it.
   * @param ignoreCollections their records do not count, as they are
   *   deleted together with the record
   */
  async usages(id: string, ignoreCollections: string[] = []): Promise<number> {
    await this.ready;

    return [...this.records.values()].filter(
      (record) =>
        !this.hidden.has(record.id) &&
        !ignoreCollections.includes(String(record['collectionName'])) &&
        Object.entries(record).some(
          ([field, value]) =>
            field !== 'id' &&
            (value === id || (Array.isArray(value) && value.includes(id))),
        ),
    ).length;
  }

  /**
   * Treats records as deleted without deleting them yet, so deleting can be
   * undone for a moment: `unhide` brings them back, `delete` makes it final
   */
  hide(ids: string[]): void {
    ids.forEach((id) => this.hidden.add(id));
    this.revision.update((revision) => revision + 1);
  }

  unhide(ids: string[]): void {
    ids.forEach((id) => this.hidden.delete(id));
    this.revision.update((revision) => revision + 1);
  }

  getFileUrl(record: DataRecord, fileName: string): string {
    return this.remote.getFileUrl(record, fileName);
  }

  /**
   * Sends the queued records and fetches the current data. Never rejects:
   * the result is reflected in `isOnline` and `syncError`.
   */
  async sync(): Promise<void> {
    await this.ready;
    await this.startSync();
  }

  private startSync(): Promise<void> {
    if (this.running) {
      // Records may have been queued after the running sync sent its queue
      this.rerun = true;
      return this.running;
    }

    this.running = this.runSync().finally(() => {
      this.running = null;
      if (this.rerun) {
        this.rerun = false;
        void this.startSync();
      }
    });
    return this.running;
  }

  private async runSync(): Promise<void> {
    this.isSyncing.set(true);
    try {
      const allSent = await this.push();
      const changed = await this.pull();

      const now = new Date();
      await this.storage.setLastSyncedAt(now.toISOString());
      this.lastSyncedAt.set(now);
      this.isOnline.set(true);
      if (allSent) this.syncError.set(null);
      if (changed) this.revision.update((revision) => revision + 1);
    } catch (error) {
      if (isNetworkError(error)) {
        this.isOnline.set(false);
      } else {
        this.syncError.set(
          error instanceof Error ? error.message : 'Synchronization failed',
        );
      }
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Sends the queue in the order of creation, as records can refer to
   * records created before them.
   * @returns false if the server rejected a record; it stays in the queue
   */
  private async push(): Promise<boolean> {
    while (this.outbox.length > 0) {
      const item = this.outbox[0];
      try {
        if (item.delete) {
          await this.remote.delete({
            collectionName: item.collectionName,
            id: item.data.id,
          });
        } else if (item.update) {
          const { id, ...data } = item.data;
          await this.remote.update({
            collectionName: item.collectionName,
            id,
            data,
            map: (record) => record,
          });
        } else {
          await this.remote.create({
            collectionName: item.collectionName,
            data: item.data,
            map: (record) => record,
          });
        }
      } catch (error) {
        if (isNetworkError(error)) throw error;
        // Repeating a request that already took effect is not a failure
        const isDone =
          item.delete || item.update
            ? isNotFound(error)
            : isAlreadyCreated(error);
        if (!isDone) {
          const reason = error instanceof Error ? error.message : 'rejected';
          const action = item.delete
            ? 'delete'
            : item.update
              ? 'change'
              : 'send';
          this.syncError.set(
            `Could not ${action} a record of "${item.collectionName}": ${reason}`,
          );
          return false;
        }
      }

      await this.storage.removeFromOutbox(item.seq);
      // By seq: the queue can change while a request is on its way
      this.outbox = this.outbox.filter((other) => other.seq !== item.seq);
      this.pendingCount.set(this.outbox.length);
    }
    return true;
  }

  /**
   * Replaces the local copy by the data of the server, except for records
   * that are still queued.
   * @returns whether the local copy changed
   */
  private async pull(): Promise<boolean> {
    let changed = false;

    for (const collectionName of this.collections) {
      const fetched = await this.remote.list<DataRecord>({
        collectionName,
        map: (record) => ({ ...record, collectionName }),
      });

      const pendingIds = new Set(this.outbox.map((item) => item.data.id));
      const fetchedIds = new Set(fetched.map((record) => record.id));

      const put = fetched.filter(
        (record) =>
          !pendingIds.has(record.id) &&
          this.records.get(record.id)?.updated !== record.updated,
      );
      const deleteIds = [...this.records.values()]
        .filter(
          (record) =>
            record['collectionName'] === collectionName &&
            !fetchedIds.has(record.id) &&
            !pendingIds.has(record.id),
        )
        .map((record) => record.id);

      if (put.length === 0 && deleteIds.length === 0) continue;

      await this.storage.applyChanges(put, deleteIds);
      put.forEach((record) => this.records.set(record.id, record));
      deleteIds.forEach((id) => this.records.delete(id));
      changed = true;
    }

    return changed;
  }

  private isInRange(record: DataRecord, { field, from, to }: DateRange) {
    const time = toDate(record[field]).getTime();
    return time >= from.getTime() && time < to.getTime();
  }

  /** Supports the PocketBase notation, e.g. "name" or "-date,name" */
  private comparator(sort: string): (a: DataRecord, b: DataRecord) => number {
    const fields = sort.split(',').map((part) => {
      const name = part.trim();
      return name.startsWith('-')
        ? { name: name.slice(1), direction: -1 }
        : { name: name.replace(/^\+/, ''), direction: 1 };
    });

    return (a, b) => {
      for (const { name, direction } of fields) {
        const left = a[name];
        const right = b[name];
        const order =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left ?? '').localeCompare(String(right ?? ''));
        if (order !== 0) return order * direction;
      }
      return 0;
    };
  }

  /**
   * Adds the related records like PocketBase does for its `expand` option,
   * e.g. "to_symptom.to_locations"
   */
  private expand(record: DataRecord, paths: string[]): DataRecord {
    if (paths.length === 0) return record;

    const nestedByField = new Map<string, string[]>();
    for (const path of paths) {
      const [field, ...rest] = path.split('.');
      const nested = nestedByField.get(field) ?? [];
      if (rest.length > 0) nested.push(rest.join('.'));
      nestedByField.set(field, nested);
    }

    const expand: Record<string, DataRecord | DataRecord[]> = {};
    for (const [field, nested] of nestedByField) {
      const value = record[field];
      const resolve = (id: unknown) => {
        const related = this.records.get(String(id));
        return related ? [this.expand(related, nested)] : [];
      };

      if (Array.isArray(value)) {
        expand[field] = value.flatMap(resolve);
      } else if (value) {
        const [related] = resolve(value);
        if (related) expand[field] = related;
      }
    }
    return { ...record, expand };
  }
}
