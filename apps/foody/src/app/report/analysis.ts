/**
 * Looks for foods and dishes that are followed by symptoms more often than
 * meals in general. This is a hint where to look, not a proof: things that
 * are eaten together or often cannot be told apart, and a few entries can
 * be a coincidence.
 */

export type Exposure = {
  /** The food or dish that was eaten */
  itemId: string;
  name: string;
  kind: 'food' | 'dish';
  /** The meal entry it belongs to */
  entryId: string;
  time: Date;
};

export type Complaint = { time: Date };

export type Finding = {
  itemId: string;
  name: string;
  kind: 'food' | 'dish';
  /** How often it was eaten */
  eaten: number;
  /** How often symptoms followed within the time span */
  followed: number;
  /** followed / eaten */
  rate: number;
  /** How many of the symptom entries it was eaten before */
  preceded: number;
  /**
   * conspicuous: followed by symptoms clearly more often than meals in
   * general; unclear: eaten too rarely to tell
   */
  rating: 'conspicuous' | 'unremarkable' | 'unclear';
  /** How far it is above what is usual, for sorting */
  excess: number;
};

export type Analysis = {
  meals: number;
  complaints: number;
  /** The share of all meals that were followed by symptoms */
  baseline: number;
  findings: Finding[];
};

/** Below this, the share of an item says too little */
export const MIN_TIMES_EATEN = 3;

const HOUR = 3_600_000;

/**
 * A cautious estimate of a share: the lower end of the range in which the
 * true share plausibly lies (Wilson score interval). 2 of 2 counts less
 * than 8 of 10 this way.
 */
function cautiousShare(hits: number, total: number): number {
  if (total === 0) return 0;
  const z = 1;
  const share = hits / total;
  const center = share + (z * z) / (2 * total);
  const margin =
    z *
    Math.sqrt((share * (1 - share)) / total + (z * z) / (4 * total * total));
  return (center - margin) / (1 + (z * z) / total);
}

export function analyze(
  exposures: Exposure[],
  complaints: Complaint[],
  hours: number,
): Analysis {
  const span = hours * HOUR;
  const complaintTimes = complaints
    .map((complaint) => complaint.time.getTime())
    .sort((a, b) => a - b);
  const isFollowed = (time: number) =>
    complaintTimes.some((other) => other > time && other <= time + span);

  // What is usual: how often any meal is followed by symptoms
  const mealTimes = new Map<string, number>();
  for (const exposure of exposures) {
    mealTimes.set(exposure.entryId, exposure.time.getTime());
  }
  const followedMeals = [...mealTimes.values()].filter(isFollowed).length;
  const baseline = mealTimes.size > 0 ? followedMeals / mealTimes.size : 0;

  // An item counts once per meal, even if it is in several of its dishes
  const byItem = new Map<string, Exposure[]>();
  const seen = new Set<string>();
  for (const exposure of exposures) {
    const key = `${exposure.itemId}@${exposure.entryId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    byItem.set(exposure.itemId, [
      ...(byItem.get(exposure.itemId) ?? []),
      exposure,
    ]);
  }

  const findings = [...byItem.values()].map((eaten): Finding => {
    const times = eaten.map((exposure) => exposure.time.getTime());
    const followed = times.filter(isFollowed).length;
    const preceded = complaintTimes.filter((complaint) =>
      times.some((time) => time < complaint && time >= complaint - span),
    ).length;
    const excess = cautiousShare(followed, times.length) - baseline;

    return {
      itemId: eaten[0].itemId,
      name: eaten[0].name,
      kind: eaten[0].kind,
      eaten: times.length,
      followed,
      rate: followed / times.length,
      preceded,
      rating:
        times.length < MIN_TIMES_EATEN
          ? 'unclear'
          : excess > 0 && followed >= 2
            ? 'conspicuous'
            : 'unremarkable',
      excess,
    };
  });

  const order = { conspicuous: 0, unremarkable: 1, unclear: 2 };
  findings.sort(
    (a, b) =>
      order[a.rating] - order[b.rating] ||
      b.excess - a.excess ||
      b.eaten - a.eaten ||
      a.name.localeCompare(b.name),
  );

  return {
    meals: mealTimes.size,
    complaints: complaintTimes.length,
    baseline,
    findings,
  };
}
