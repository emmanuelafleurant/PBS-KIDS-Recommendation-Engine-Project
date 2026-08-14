import type { ContentItem } from '../models/content-item.js';

/**
 * Corpus-level attribute fields eligible for IDF weighting.
 */
type SetField = 'theme' | 'tags' | 'gameplay' | 'mechanic' | 'perspective';

/**
 * Inverse document frequency per attribute value: `log(N / df)`, where
 * `df` is the number of corpus items carrying that value and `N` is the
 * corpus size. Values present in every item (df === N) get idf 0 —
 * fully non-discriminative, contributing no weight to a weighted
 * Jaccard calculation.
 */
export function computeIdf(
  items: ContentItem[],
  field: SetField,
): Map<string, number> {
  const n = items.length;
  const df = new Map<string, number>();
  for (const item of items) {
    for (const value of item[field]) {
      df.set(value, (df.get(value) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [value, count] of df) {
    idf.set(value, Math.log(n / count));
  }
  return idf;
}

/**
 * IDF-weighted Jaccard similarity:
 *
 *   sum(idf(t) for t in A ∩ B) / sum(idf(t) for t in A ∪ B)
 *
 * A value absent from `idf` (not present in the corpus the map was
 * built from) falls back to weight 1, so an unweighted value never
 * silently drops out of the union.
 *
 * Edge cases mirror `jaccard`: both inputs empty -> 0 (not NaN); a
 * union whose total weight collapses to 0 (every shared value is
 * maximally common, idf === 0 for all of them) -> 0.
 */
export function weightedJaccard(
  a: Set<string> | string[],
  b: Set<string> | string[],
  idf: Map<string, number>,
): number {
  const setA = a instanceof Set ? a : new Set(a);
  const setB = b instanceof Set ? b : new Set(b);

  if (setA.size === 0 && setB.size === 0) {
    return 0;
  }

  let intersectionWeight = 0;
  let unionWeight = 0;
  for (const value of setA) {
    const weight = idf.get(value) ?? 1;
    unionWeight += weight;
    if (setB.has(value)) {
      intersectionWeight += weight;
    }
  }
  for (const value of setB) {
    if (!setA.has(value)) {
      unionWeight += idf.get(value) ?? 1;
    }
  }

  if (unionWeight === 0) {
    return 0;
  }
  return intersectionWeight / unionWeight;
}
