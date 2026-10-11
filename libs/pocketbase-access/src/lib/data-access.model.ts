/**
 * For the sake of simplicity, this file is still in pocketbase-lib.
 * As I would some day using a other db ...
 */

/**
 * Generic record of a collection
 */
export type DataRecord = {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
};

/**
 * Records whose date `field` is at or after `from` and before `to`
 */
export type DateRange = {
  field: string;
  from: Date;
  to: Date;
};

/**
 * Options for the list function
 */
export type ListOptions = {
  sort?: string;
  dateRange?: DateRange;
  expand?: string;
};

export type ListQuery<T> = {
  /**
   * Name of the collection
   */
  collectionName: string;
  /**
   * Options like sort
   */
  options?: ListOptions;
  /**
   * Transformation function to <T>
   * @param record data from the db
   * @returns The wanted data type from the app
   */
  map: (record: DataRecord) => T;
};

export type CreateQuery<T> = {
  collectionName: string;
  data: Record<string, unknown>;
  map: (record: DataRecord) => T;
};

export type DeleteQuery = {
  collectionName: string;
  id: string;
};

export interface DataAccess {
  /**
   *
   * @param query
   */
  list<T>(query: ListQuery<T>): Promise<T[]>;
  create<T>(query: CreateQuery<T>): Promise<T>;
  delete(query: DeleteQuery): Promise<void>;
  getFileUrl(record: DataRecord, fileName: string): string;
}

export interface DataAccessConfig {
  url: string;
  port?: number;
  /**
   * Collections that are copied to the device for offline use
   */
  collections?: string[];
}
