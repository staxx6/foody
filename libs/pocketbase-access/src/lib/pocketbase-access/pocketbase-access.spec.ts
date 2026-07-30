import { TestBed } from '@angular/core/testing';
import { DATA_ACCESS_CONFIG } from '../data-access.token';
import { PocketbaseAccessService } from './pocketbase-access';

describe('PocketbaseAccessService', () => {
  let service: PocketbaseAccessService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DATA_ACCESS_CONFIG,
          useValue: {
            url: 'http://127.0.0.1',
            port: 8090,
          },
        },
      ],
    });
    service = TestBed.inject(PocketbaseAccessService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});
