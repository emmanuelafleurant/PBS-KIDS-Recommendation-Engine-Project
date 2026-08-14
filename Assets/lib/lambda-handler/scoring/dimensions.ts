import type { ContentItem } from '../models/content-item.js';
import { jaccard } from './jaccard.js';
import { weightedJaccard } from './idf.js';

/**
 * Corpus-derived IDF maps for the two `themeScore` fields. When passed
 * to `themeScore`, each field's Jaccard term is IDF-weighted instead of
 * unweighted — see `weightedJaccard`.
 */
export interface ThemeIdf {
  theme: Map<string, number>;
  tags: Map<string, number>;
}

/**
 * Theme-dimension similarity.
 *
 * Weighted combination of Jaccard over the `theme` and `tags` sets:
 *
 *   themeScore = (jaccard(theme) * 4 + jaccard(tags) * 2.5) / 6.5
 *
 * The denominator is the sum of weights (4 + 2.5), so the output is
 * normalized to [0, 1] whenever every Jaccard term is in [0, 1] —
 * which it always is.
 *
 * When `idf` is supplied, each Jaccard term is IDF-weighted (shared
 * values that are rare across the corpus count for more than shared
 * values nearly every item has) rather than plain set-overlap Jaccard.
 * Omitting `idf` preserves the original unweighted behavior.
 */
export function themeScore(
  a: ContentItem,
  b: ContentItem,
  idf?: ThemeIdf,
): number {
  const themeJ = idf
    ? weightedJaccard(a.theme, b.theme, idf.theme)
    : jaccard(a.theme, b.theme);
  const tagsJ = idf
    ? weightedJaccard(a.tags, b.tags, idf.tags)
    : jaccard(a.tags, b.tags);
  return (themeJ * 4 + tagsJ * 2.5) / 6.5;
}

/**
 * Mechanic-dimension similarity.
 *
 * Weighted combination of Jaccard over the gameplay / mechanic /
 * perspective sets:
 *
 *   mechScore = (jaccard(gameplay) * 3.5 + jaccard(mechanic) * 2
 *                + jaccard(perspective) * 1) / 6.5
 */
export function mechScore(a: ContentItem, b: ContentItem): number {
  const gameplayJ = jaccard(a.gameplay, b.gameplay);
  const mechanicJ = jaccard(a.mechanic, b.mechanic);
  const perspectiveJ = jaccard(a.perspective, b.perspective);
  return (gameplayJ * 3.5 + mechanicJ * 2 + perspectiveJ * 1) / 6.5;
}

/**
 * Effective (min, max) age range for an item.
 *
 * Walks the priority chain editorial -> show -> curriculum and returns
 * the FIRST tier where both bounds are non-null. If no tier provides
 * both bounds, returns null. (A tier with only one bound present is
 * treated as "missing" and the next tier is consulted.)
 *
 * Treating null/undefined symmetrically matches the recommended JSON
 * loader behavior — absent JSON keys deserialize to undefined.
 */
export function effectiveRange(
  item: ContentItem,
): { min: number; max: number } | null {
  // Editorial tier (highest priority).
  if (item.editorialMinAge != null && item.editorialMaxAge != null) {
    return { min: item.editorialMinAge, max: item.editorialMaxAge };
  }
  // Show tier.
  if (item.showMinAge != null && item.showMaxAge != null) {
    return { min: item.showMinAge, max: item.showMaxAge };
  }
  // Curriculum tier (last-resort fallback).
  if (item.curriculumMinAge != null && item.curriculumMaxAge != null) {
    return { min: item.curriculumMinAge, max: item.curriculumMaxAge };
  }
  return null;
}

/**
 * Interval Intersection-over-Union for two closed integer ranges.
 *
 *   IoU = max(0, min(maxA, maxB) - max(minA, minB))
 *         / (max(maxA, maxB) - min(minA, minB))
 *
 * Returns 0 when the intervals are disjoint and 1 when identical.
 *
 * Edge case: if the union span collapses to 0 (rangeA === rangeB and
 * min === max — i.e. both are point intervals at the same age) the
 * formula would divide by zero. We treat that as a perfect match and
 * return 1.
 */
function intervalIoU(
  rangeA: { min: number; max: number },
  rangeB: { min: number; max: number },
): number {
  const intersection = Math.max(
    0,
    Math.min(rangeA.max, rangeB.max) - Math.max(rangeA.min, rangeB.min),
  );
  const unionSpan =
    Math.max(rangeA.max, rangeB.max) - Math.min(rangeA.min, rangeB.min);
  if (unionSpan === 0) {
    // Both intervals collapse to the same point — perfect overlap.
    return 1;
  }
  return intersection / unionSpan;
}

/**
 * Age-dimension similarity.
 *
 * Computes the IoU of the two items' effective age ranges (per
 * `effectiveRange`'s priority chain). If either item has no effective
 * range, returns 0 — the spec treats "missing age" as no signal.
 */
export function ageScore(a: ContentItem, b: ContentItem): number {
  const rangeA = effectiveRange(a);
  const rangeB = effectiveRange(b);
  if (rangeA === null || rangeB === null) {
    return 0;
  }
  return intervalIoU(rangeA, rangeB);
}
