import { InjectionToken } from '@angular/core';
import { DataRecord } from '../data-access.model';

/**
 * A record created on this device that the server does not know yet
 */
export type OutboxItem = {
  /** Order of creation, records are sent in this order */
  seq: number;
  collectionName: string;
  /** The data to create, including the id generated on this device */
  data: Record<string, unknown> & { id: string };
};

export type OfflineSnapshot = {
  records: DataRecord[];
  outbox: OutboxItem[];
  lastSyncedAt: string | null;
};

/**
 * Persistence of the local copy, so it survives closing the app
 */
export interface OfflineStorage {
  load(): Promise<OfflineSnapshot>;
  /** Stores a locally created record together with its outbox item */
  addLocal(
    record: DataRecord,
    item: Omit<OutboxItem, 'seq'>,
  ): Promise<OutboxItem>;
  removeFromOutbox(seq: number): Promise<void>;
  applyChanges(put: DataRecord[], deleteIds: string[]): Promise<void>;
  setLastSyncedAt(value: string): Promise<void>;
}

const DB_NAME = 'foody-offline';
const RECORDS = 'records';
const OUTBOX = 'outbox';
const META = 'meta';
const LAST_SYNCED_AT = 'lastSyncedAt';

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export class IndexedDbOfflineStorage implements OfflineStorage {
  private readonly db = this.open();

  private open(): Promise<IDBDatabase> {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(RECORDS, { keyPath: 'id' });
      db.createObjectStore(OUTBOX, { keyPath: 'seq', autoIncrement: true });
      db.createObjectStore(META);
    };
    return result(request);
  }

  async load(): Promise<OfflineSnapshot> {
    const tx = (await this.db).transaction([RECORDS, OUTBOX, META]);
    const [records, outbox, lastSyncedAt] = await Promise.all([
      result<DataRecord[]>(tx.objectStore(RECORDS).getAll()),
      result<OutboxItem[]>(tx.objectStore(OUTBOX).getAll()),
      result<string | undefined>(tx.objectStore(META).get(LAST_SYNCED_AT)),
    ]);
    return { records, outbox, lastSyncedAt: lastSyncedAt ?? null };
  }

  async addLocal(
    record: DataRecord,
    item: Omit<OutboxItem, 'seq'>,
  ): Promise<OutboxItem> {
    const tx = (await this.db).transaction([RECORDS, OUTBOX], 'readwrite');
    tx.objectStore(RECORDS).put(record);
    const seq = await result(tx.objectStore(OUTBOX).add(item));
    await done(tx);
    return { ...item, seq: Number(seq) };
  }

  async removeFromOutbox(seq: number): Promise<void> {
    const tx = (await this.db).transaction(OUTBOX, 'readwrite');
    tx.objectStore(OUTBOX).delete(seq);
    await done(tx);
  }

  async applyChanges(put: DataRecord[], deleteIds: string[]): Promise<void> {
    const tx = (await this.db).transaction(RECORDS, 'readwrite');
    const store = tx.objectStore(RECORDS);
    put.forEach((record) => store.put(record));
    deleteIds.forEach((id) => store.delete(id));
    await done(tx);
  }

  async setLastSyncedAt(value: string): Promise<void> {
    const tx = (await this.db).transaction(META, 'readwrite');
    tx.objectStore(META).put(value, LAST_SYNCED_AT);
    await done(tx);
  }
}

/**
 * Keeps everything in memory only, for tests and browsers without IndexedDB
 */
export class MemoryOfflineStorage implements OfflineStorage {
  private readonly records = new Map<string, DataRecord>();
  private outbox: OutboxItem[] = [];
  private lastSyncedAt: string | null = null;
  private nextSeq = 1;

  async load(): Promise<OfflineSnapshot> {
    return {
      records: [...this.records.values()],
      outbox: [...this.outbox],
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  async addLocal(
    record: DataRecord,
    item: Omit<OutboxItem, 'seq'>,
  ): Promise<OutboxItem> {
    const stored = { ...item, seq: this.nextSeq++ };
    this.records.set(record.id, record);
    this.outbox.push(stored);
    return stored;
  }

  async removeFromOutbox(seq: number): Promise<void> {
    this.outbox = this.outbox.filter((item) => item.seq !== seq);
  }

  async applyChanges(put: DataRecord[], deleteIds: string[]): Promise<void> {
    put.forEach((record) => this.records.set(record.id, record));
    deleteIds.forEach((id) => this.records.delete(id));
  }

  async setLastSyncedAt(value: string): Promise<void> {
    this.lastSyncedAt = value;
  }
}

export const OFFLINE_STORAGE = new InjectionToken<OfflineStorage>(
  'OFFLINE_STORAGE',
  {
    providedIn: 'root',
    factory: () =>
      typeof indexedDB === 'undefined'
        ? new MemoryOfflineStorage()
        : new IndexedDbOfflineStorage(),
  },
);
