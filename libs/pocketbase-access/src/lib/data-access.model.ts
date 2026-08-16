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
 * Options for the list function
 */
export type ListOptions = {
  sort?: string;
  filter?: string;
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

/**
 * Generic interface to access the backend.
 * This should not return signals as this access should
 * not hold the state. It should only get/set the data
 */
export interface DataAccess {
  /**
   *
   * @param query
   */
  list<T>(query: ListQuery<T>): Promise<T[]>;
  getFileUrl(record: DataRecord, fileName: string): string;
}

export interface DataAccessConfig {
  url: string;
  port: number;
}
