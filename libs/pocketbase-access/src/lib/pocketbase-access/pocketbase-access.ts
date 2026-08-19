import { inject, Injectable, InjectionToken } from '@angular/core';
import PocketBase from 'pocketbase';
import {
  CreateQuery,
  DataAccess,
  DataRecord,
  ListQuery,
} from '../data-access.model';
import { DATA_ACCESS_CONFIG } from '../data-access.token';

@Injectable({ providedIn: 'root' })
export class PocketbaseAccessService implements DataAccess {
  private readonly config = inject(DATA_ACCESS_CONFIG);
  private readonly pb = new PocketBase(
    `${this.config.url}:${this.config.port}`,
  );

  async list<T>({ collectionName, options, map }: ListQuery<T>): Promise<T[]> {
    // The receive from the db
    const records = await this.pb
      .collection(collectionName)
      .getFullList({
        sort: options?.sort,
        filter: options?.filter,
        expand: options?.expand,
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

  getFileUrl(record: DataRecord, fileName: string): string {
    return this.pb.files.getURL(record, fileName);
  }

  async create<T>({ collectionName, data, map }: CreateQuery<T>): Promise<T> {
    const record = await this.pb.collection(collectionName).create(data);
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
