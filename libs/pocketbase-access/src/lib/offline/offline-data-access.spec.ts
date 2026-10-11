import { TestBed } from '@angular/core/testing';
import { CreateQuery, DataRecord, ListQuery } from '../data-access.model';
import { DATA_ACCESS_CONFIG } from '../data-access.token';
import { PocketbaseAccessService } from '../pocketbase-access/pocketbase-access';
import { OfflineDataAccessService } from './offline-data-access';
import { MemoryOfflineStorage, OFFLINE_STORAGE } from './offline-storage';

/** Stands in for the server and can be switched off */
class FakeServer {
  online = true;
  rejectCollection: string | null = null;
  readonly records: DataRecord[] = [];
  readonly createCalls: string[] = [];
  readonly deleteCalls: string[] = [];

  private assertReachable(): void {
    if (!this.online) throw Object.assign(new Error('offline'), { status: 0 });
  }

  async list<T>({ collectionName, map }: ListQuery<T>): Promise<T[]> {
    this.assertReachable();
    return this.records
      .filter((record) => record['collectionName'] === collectionName)
      .map(map);
  }

  async create<T>({ collectionName, data, map }: CreateQuery<T>): Promise<T> {
    this.assertReachable();
    this.createCalls.push(String(data['id']));
    if (collectionName === this.rejectCollection) {
      throw Object.assign(new Error('invalid'), {
        status: 400,
        response: { data: { name: { code: 'validation_required' } } },
      });
    }
    if (this.records.some((record) => record.id === data['id'])) {
      throw Object.assign(new Error('duplicate'), {
        status: 400,
        response: { data: { id: { code: 'validation_not_unique' } } },
      });
    }
    const record = {
      ...data,
      id: String(data['id']),
      collectionName,
      created: 'server',
      updated: 'server',
    };
    this.records.push(record);
    return map(record);
  }

  async delete({ id }: { id: string }): Promise<void> {
    this.assertReachable();
    this.deleteCalls.push(id);
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw Object.assign(new Error('gone'), { status: 404 });
    this.records.splice(index, 1);
  }

  getFileUrl(): string {
    return '';
  }
}

const identity = (record: DataRecord) => record;

describe('OfflineDataAccessService', () => {
  let server: FakeServer;
  let storage: MemoryOfflineStorage;

  function createService(): OfflineDataAccessService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DATA_ACCESS_CONFIG,
          useValue: {
            url: 'http://127.0.0.1',
            port: 8090,
            collections: ['foodItems', 'dishEntries'],
          },
        },
        { provide: PocketbaseAccessService, useValue: server },
        { provide: OFFLINE_STORAGE, useValue: storage },
      ],
    });
    return TestBed.inject(OfflineDataAccessService);
  }

  beforeEach(() => {
    server = new FakeServer();
    storage = new MemoryOfflineStorage();
  });

  it('should load the data of the server', async () => {
    server.records.push(
      {
        id: 'b',
        collectionName: 'foodItems',
        name: 'Pear',
        created: '',
        updated: '1',
      },
      {
        id: 'a',
        collectionName: 'foodItems',
        name: 'Apple',
        created: '',
        updated: '1',
      },
    );
    const service = createService();

    const items = await service.list({
      collectionName: 'foodItems',
      options: { sort: 'name' },
      map: (record) => record['name'],
    });

    expect(items).toEqual(['Apple', 'Pear']);
    expect(service.isOnline()).toBe(true);
  });

  it('should fail to list when the device never reached the server', async () => {
    server.online = false;
    const service = createService();

    await expect(
      service.list({ collectionName: 'foodItems', map: identity }),
    ).rejects.toThrow();
    expect(service.isOnline()).toBe(false);
  });

  it('should keep records created offline and send them later', async () => {
    const service = createService();
    await service.sync();
    server.online = false;

    const item = await service.create({
      collectionName: 'foodItems',
      data: { name: 'Apple' },
      map: identity,
    });
    await service.sync();

    expect(item.id).toMatch(/^[a-z0-9]{15}$/);
    expect(service.pendingCount()).toBe(1);
    expect(service.isOnline()).toBe(false);
    expect(
      await service.list({ collectionName: 'foodItems', map: identity }),
    ).toHaveLength(1);

    server.online = true;
    await service.sync();

    expect(service.pendingCount()).toBe(0);
    expect(server.records.map((record) => record.id)).toEqual([item.id]);
    // The local copy is replaced by the version of the server
    const [synced] = await service.list({
      collectionName: 'foodItems',
      map: identity,
    });
    expect(synced.updated).toBe('server');
  });

  it('should queue files but keep them out of the local copy', async () => {
    const service = createService();
    await service.sync();
    server.online = false;
    const photo = new Blob(['photo']);

    const item = await service.create({
      collectionName: 'foodItems',
      data: { name: 'Apple', images: [photo] },
      map: identity,
    });

    expect(item['images']).toEqual([]);
    const { outbox } = await storage.load();
    expect(outbox[0].data['images']).toEqual([photo]);
  });

  it('should delete offline and tell the server later', async () => {
    server.records.push(
      { id: 'a', collectionName: 'foodItems', created: '', updated: '1' },
      { id: 'b', collectionName: 'foodItems', created: '', updated: '1' },
    );
    const service = createService();
    await service.sync();
    server.online = false;

    await service.delete({ collectionName: 'foodItems', id: 'a' });
    await service.sync();

    const ids = () =>
      service.list({ collectionName: 'foodItems', map: (record) => record.id });
    expect(await ids()).toEqual(['b']);
    expect(service.pendingCount()).toBe(1);

    server.online = true;
    await service.sync();

    expect(server.records.map((record) => record.id)).toEqual(['b']);
    expect(await ids()).toEqual(['b']);
    expect(service.pendingCount()).toBe(0);
  });

  it('should not send a record that was created and deleted offline', async () => {
    const service = createService();
    await service.sync();
    server.online = false;
    const item = await service.create({
      collectionName: 'foodItems',
      data: { name: 'Apple' },
      map: identity,
    });
    await service.sync();

    await service.delete({ collectionName: 'foodItems', id: item.id });
    server.online = true;
    await service.sync();

    expect(service.pendingCount()).toBe(0);
    expect(server.createCalls).toEqual([]);
    expect(server.deleteCalls).toEqual([]);
  });

  it('should accept that a record was already deleted elsewhere', async () => {
    server.records.push({
      id: 'a',
      collectionName: 'foodItems',
      created: '',
      updated: '1',
    });
    const service = createService();
    await service.sync();
    server.online = false;
    await service.delete({ collectionName: 'foodItems', id: 'a' });
    await service.sync();
    // Another device deleted it in the meantime
    server.records.length = 0;

    server.online = true;
    await service.sync();

    expect(service.pendingCount()).toBe(0);
    expect(service.syncError()).toBeNull();
  });

  it('should count the records that refer to a record', async () => {
    server.records.push(
      { id: 'food', collectionName: 'foodItems', created: '', updated: '1' },
      {
        id: 'e1',
        collectionName: 'dishEntries',
        to_foodItem: 'food',
        created: '',
        updated: '1',
      },
      {
        id: 'e2',
        collectionName: 'dishEntries',
        to_foods: ['x', 'food'],
        created: '',
        updated: '1',
      },
      {
        id: 'e3',
        collectionName: 'dishEntries',
        to_foodItem: 'other',
        created: '',
        updated: '1',
      },
    );
    const service = createService();

    expect(await service.usages('food')).toBe(2);
    expect(await service.usages('e1')).toBe(0);
  });

  it('should send queued records in the order of creation', async () => {
    const service = createService();
    await service.sync();
    server.online = false;

    const food = await service.create({
      collectionName: 'foodItems',
      data: { name: 'Apple' },
      map: identity,
    });
    const entry = await service.create({
      collectionName: 'dishEntries',
      data: { to_foodItem: food.id },
      map: identity,
    });
    server.online = true;
    await service.sync();

    expect(server.createCalls).toEqual([food.id, entry.id]);
  });

  it('should survive a restart with queued records', async () => {
    let service = createService();
    await service.sync();
    server.online = false;
    const item = await service.create({
      collectionName: 'foodItems',
      data: { name: 'Apple' },
      map: identity,
    });
    await service.sync();

    service = createService();
    expect(
      await service.list({ collectionName: 'foodItems', map: identity }),
    ).toHaveLength(1);
    expect(service.pendingCount()).toBe(1);

    server.online = true;
    await service.sync();
    expect(server.records.map((record) => record.id)).toEqual([item.id]);
  });

  it('should not create a record twice when the answer got lost', async () => {
    const service = createService();
    await service.sync();
    server.online = false;
    const item = await service.create({
      collectionName: 'foodItems',
      data: { name: 'Apple' },
      map: identity,
    });
    await service.sync();
    // The server created the record, but the device never got the answer
    server.records.push({
      id: item.id,
      collectionName: 'foodItems',
      name: 'Apple',
      created: 'server',
      updated: 'server',
    });

    server.online = true;
    await service.sync();

    expect(service.pendingCount()).toBe(0);
    expect(service.syncError()).toBeNull();
    expect(server.records).toHaveLength(1);
  });

  it('should keep a rejected record and still fetch new data', async () => {
    const service = createService();
    await service.sync();
    server.rejectCollection = 'foodItems';
    await service.create({
      collectionName: 'foodItems',
      data: { name: '' },
      map: identity,
    });
    server.records.push({
      id: 'other',
      collectionName: 'dishEntries',
      created: '',
      updated: '1',
    });
    await service.sync();

    expect(service.pendingCount()).toBe(1);
    expect(service.syncError()).toContain('foodItems');
    expect(
      await service.list({ collectionName: 'dishEntries', map: identity }),
    ).toHaveLength(1);
  });

  it('should take over records and deletions of other devices', async () => {
    server.records.push({
      id: 'a',
      collectionName: 'foodItems',
      name: 'Apple',
      created: '',
      updated: '1',
    });
    const service = createService();
    await service.sync();
    const revision = service.revision();

    server.records.length = 0;
    server.records.push({
      id: 'b',
      collectionName: 'foodItems',
      name: 'Pear',
      created: '',
      updated: '1',
    });
    await service.sync();

    const names = await service.list({
      collectionName: 'foodItems',
      map: (record) => record['name'],
    });
    expect(names).toEqual(['Pear']);
    expect(service.revision()).toBe(revision + 1);

    await service.sync();
    expect(service.revision()).toBe(revision + 1);
  });

  it('should filter by date range and expand relations locally', async () => {
    server.records.push(
      {
        id: 'food',
        collectionName: 'foodItems',
        name: 'Apple',
        to_units: ['u1', 'gone'],
        created: '',
        updated: '1',
      },
      {
        id: 'u1',
        collectionName: 'foodItems',
        name: 'Unit',
        created: '',
        updated: '1',
      },
      {
        id: 'e1',
        collectionName: 'dishEntries',
        date: '2026-10-11 08:00:00.000Z',
        to_foodItem: 'food',
        created: '',
        updated: '1',
      },
      {
        id: 'e2',
        collectionName: 'dishEntries',
        date: '2026-10-12 08:00:00.000Z',
        to_foodItem: 'food',
        created: '',
        updated: '1',
      },
    );
    const service = createService();

    const entries = await service.list({
      collectionName: 'dishEntries',
      options: {
        dateRange: {
          field: 'date',
          from: new Date('2026-10-11T00:00:00Z'),
          to: new Date('2026-10-12T00:00:00Z'),
        },
        expand: 'to_foodItem,to_foodItem.to_units',
      },
      map: identity,
    });

    expect(entries.map((entry) => entry.id)).toEqual(['e1']);
    const expand = entries[0]['expand'] as Record<string, DataRecord>;
    expect(expand['to_foodItem']['name']).toBe('Apple');
    const nested = expand['to_foodItem']['expand'] as Record<
      string,
      DataRecord[]
    >;
    expect(nested['to_units'].map((unit) => unit.id)).toEqual(['u1']);
  });
});
