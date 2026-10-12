import { inject, Injectable } from '@angular/core';
import { DATA_ACCESS } from '@foody/pocketbase-access';

/** How many of the options that were used last are offered first */
const RECENT_COUNT = 6;

/**
 * Knows what was logged last, to offer it first when logging again
 */
@Injectable({ providedIn: 'root' })
export class RecentUse {
  private readonly dataAccess = inject(DATA_ACCESS);

  /**
   * What the newest entries of a collection refer to, the last used first
   * @param field the relation of the entries, e.g. `to_foodItem`
   */
  async ids(collectionName: string, field: string): Promise<string[]> {
    const used = await this.dataAccess.list({
      collectionName,
      options: { sort: '-date' },
      map: (entry) => String(entry[field] ?? ''),
    });
    return [...new Set(used.filter(Boolean))].slice(0, RECENT_COUNT);
  }
}

/**
 * The options with those used last first, in the order of their use, and
 * marked as `recent`; the others keep their order
 */
export function recentFirst<T extends { id: string }>(
  options: T[],
  recentIds: string[],
): (T & { recent?: boolean })[] {
  const recent = recentIds
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is T => !!option)
    .map((option) => ({ ...option, recent: true }));
  return [
    ...recent,
    ...options.filter((option) => !recentIds.includes(option.id)),
  ];
}
