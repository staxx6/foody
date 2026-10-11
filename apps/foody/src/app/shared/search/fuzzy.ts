/**
 * Fuzzy search for the short names of the lists (foods, dishes, units...).
 * A name matches if it contains the query, if it contains its letters in
 * that order ("apl" finds "Apple") or if it differs by a typo ("bannana").
 */

/** Lower case without accents, so "Muesli" and "müsli" find "Müsli" */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * The gaps between the letters of the query when they appear in the text in
 * that order, or null if they do not
 */
function subsequenceGaps(query: string, text: string): number | null {
  let gaps = 0;
  let position = -1;
  for (const letter of query) {
    const next = text.indexOf(letter, position + 1);
    if (next < 0) return null;
    if (position >= 0) gaps += next - position - 1;
    position = next;
  }
  return gaps;
}

/**
 * The fewest typos (wrong, missing, extra or swapped letters) with which the
 * query appears somewhere in the text
 */
function typos(query: string, text: string): number {
  // previous[j]: typos of the query so far against a part of the text that
  // ends at j. Starting anywhere in the text is free.
  let beforePrevious: number[] = [];
  let previous = new Array<number>(text.length + 1).fill(0);

  for (let i = 1; i <= query.length; i++) {
    const current = [i];
    for (let j = 1; j <= text.length; j++) {
      const same = query[i - 1] === text[j - 1];
      current[j] = Math.min(
        previous[j - 1] + (same ? 0 : 1),
        previous[j] + 1,
        current[j - 1] + 1,
      );
      const swapped =
        i > 1 &&
        j > 1 &&
        query[i - 1] === text[j - 2] &&
        query[i - 2] === text[j - 1];
      if (swapped) current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
    }
    beforePrevious = previous;
    previous = current;
  }
  return Math.min(...previous);
}

/**
 * How well the text matches the query: the lower the better, null if it
 * does not match at all
 */
export function fuzzyScore(query: string, text: string): number | null {
  const wanted = normalize(query);
  const candidate = normalize(text);
  if (!wanted) return 0;

  const index = candidate.indexOf(wanted);
  if (index === 0) return 0;
  // At the start of a word is better than in the middle of one
  if (index > 0) return candidate[index - 1] === ' ' ? 1 : 2;

  const scores: number[] = [];

  const gaps = subsequenceGaps(wanted, candidate);
  // Letters spread over the whole text are a coincidence, not a match
  if (gaps !== null && gaps <= wanted.length) scores.push(3 + gaps);

  // Short queries are too easily one typo away from anything
  const allowed = wanted.length >= 7 ? 2 : wanted.length >= 4 ? 1 : 0;
  const mistakes = typos(wanted, candidate);
  if (mistakes <= allowed) scores.push(3 + 2 * mistakes);

  return scores.length > 0 ? Math.min(...scores) : null;
}

/**
 * The items whose name matches the query, the best matches first. An empty
 * query keeps all items in their order.
 */
export function fuzzyFilter<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  if (!query.trim()) return items;

  return items
    .map((item) => ({ item, score: fuzzyScore(query, item.name) }))
    .filter(
      (match): match is { item: T; score: number } => match.score !== null,
    )
    .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => item);
}
