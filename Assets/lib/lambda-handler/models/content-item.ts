/**
 * Canonical content-item shape consumed by the scoring pipeline.
 *
 * This is the contract the data-load stage (S02) must satisfy. All
 * categorical-tag dimensions are `Set<string>` to make membership tests
 * O(1) and to give Jaccard/dimension scorers a single canonical input
 * shape (no array/Set ambiguity at the boundary).
 *
 * Age dimensions are split into three priority tiers — editorial, show,
 * curriculum — each as an independent (min, max) pair. The scoring
 * helper `effectiveRange(item)` walks them in priority order and
 * returns the first non-null pair. Any individual bound may be null
 * when only a one-sided constraint is meaningful (e.g. "ages 6+").
 */
export interface ContentItem {
  id: string;
  type: 'game' | 'video';
  title: string;
  slug: string;

  // Theme / taxonomy dimensions (used by themeScore).
  theme: Set<string>;
  tags: Set<string>;

  // Mechanic / interaction dimensions (used by mechScore).
  gameplay: Set<string>;
  mechanic: Set<string>;
  perspective: Set<string>;

  // Editorial-tier age range (highest priority).
  editorialMinAge: number | null;
  editorialMaxAge: number | null;

  // Show-tier age range (fallback when editorial is absent).
  showMinAge: number | null;
  showMaxAge: number | null;

  // Curriculum-tier age range (last-resort fallback).
  curriculumMinAge: number | null;
  curriculumMaxAge: number | null;
}
