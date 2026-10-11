/**
 * The item that already has this name, ignoring case and surrounding spaces.
 * Duplicates stay possible (they can also arise on two devices), so this is
 * meant for a hint, not for preventing them.
 */
export function findByName<T extends { name: string }>(
  items: T[],
  name: string,
): T | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return undefined;
  return items.find((item) => item.name.trim().toLowerCase() === wanted);
}
