import { inject, Injectable, InjectionToken } from '@angular/core';
import PocketBase from 'pocketbase';
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

// Fail instead of waiting endlessly when the server is not reachable
const TIMEOUT_MS = 10_000;

// PocketBase stores and compares dates as "YYYY-MM-DD HH:MM:SS.sssZ"
function toFilter({ field, from, to }: DateRange): string {
  const format = (date: Date) => date.toISOString().replace('T', ' ');
  return `${field} >= "${format(from)}" && ${field} < "${format(to)}"`;
}

@Injectable({ providedIn: 'root' })
export class PocketbaseAccessService implements DataAccess {
  private readonly config = inject(DATA_ACCESS_CONFIG);
  private readonly pb = new PocketBase(
    this.config.port
      ? `${this.config.url}:${this.config.port}`
      : this.config.url,
  );

  async list<T>({ collectionName, options, map }: ListQuery<T>): Promise<T[]> {
    // The receive from the db
    const records = await this.pb.collection(collectionName).getFullList({
      sort: options?.sort,
      filter: options?.dateRange && toFilter(options.dateRange),
      expand: options?.expand,
      // Independent requests must not cancel each other
      requestKey: null,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // Transform to our generic type
    return records.map((record) =>
      map({
        ...record,
        id: String(record['id']),
        created: String(record['created']),
        updated: String(record['updated']),
      }),
    );
  }

  async getOne<T>({
    collectionName,
    id,
    expand,
    map,
  }: GetQuery<T>): Promise<T | null> {
    try {
      const record = await this.pb.collection(collectionName).getOne(id, {
        expand,
        requestKey: null,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return map(this.toDataRecord(record));
    } catch (error) {
      if ((error as { status?: number })?.status === 404) return null;
      throw error;
    }
  }

  async update<T>({
    collectionName,
    id,
    data,
    map,
  }: UpdateQuery<T>): Promise<T> {
    const record = await this.pb.collection(collectionName).update(id, data, {
      requestKey: null,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return map(this.toDataRecord(record));
  }

  private toDataRecord(record: Record<string, unknown>): DataRecord {
    return {
      ...record,
      id: String(record['id']),
      created: String(record['created']),
      updated: String(record['updated']),
    };
  }

  async delete({ collectionName, id }: DeleteQuery): Promise<void> {
    await this.pb.collection(collectionName).delete(id, {
      requestKey: null,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  getFileUrl(record: DataRecord, fileName: string): string {
    return this.pb.files.getURL(record, fileName);
  }

  async create<T>({ collectionName, data, map }: CreateQuery<T>): Promise<T> {
    const record = await this.pb.collection(collectionName).create(data, {
      requestKey: null,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return map({
      ...record,
      id: String(record['id']),
      created: String(record['created']),
      updated: String(record['updated']),
    });
  }
}

export const DATA_ACCESS = new InjectionToken<DataAccess>('DATA_ACCESS', {
  providedIn: 'root',
  factory: () => inject(PocketbaseAccessService),
});
