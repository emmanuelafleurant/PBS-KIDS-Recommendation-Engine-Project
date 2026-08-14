import type { ContentItem } from '../models/content-item.js';
import { InsufficientCandidatesError } from '../errors/insufficient-candidates-error.js';
import { themeScore, mechScore, ageScore } from './dimensions.js';
import { computeIdf } from './idf.js';

export { InsufficientCandidatesError };

/**
 * Weights for combining the three similarity dimensions when selecting
 * recommendations. Defaults to a nearly-uniform 0.34 / 0.33 / 0.33 split
 * so the combined score sits in [0, 1] for inputs in [0, 1].
 *
 * Callers may pass arbitrary positive weights — the algorithm does not
 * require them to sum to 1.
 */
export interface Weights {
  theme: number;
  mech: number;
  age: number;
}

/**
 * The four named slot identifiers, locked by S01 planning. Slot semantics:
 *  - theme_mech_match:      top "most similar overall" pick
 *  - theme_match_mech_diff: thematically close but mechanically distant
 *  - mech_match_theme_diff: mechanically close but thematically distant
 *  - random:                uniformly drawn from the residual candidates
 */
export type SlotName =
  | 'theme_mech_match'
  | 'theme_match_mech_diff'
  | 'mech_match_theme_diff'
  | 'random';

export interface RecommendationScores {
  theme: number;
  mech: number;
  age: number;
  combined: number;
}

export interface Recommendation {
  slot: SlotName;
  item: ContentItem;
  scores: RecommendationScores;
}

export const DEFAULT_WEIGHTS: Weights = Object.freeze({
  theme: 0.34,
  mech: 0.33,
  age: 0.33,
}) as Weights;

/**
 * Epsilon used for tie detection. Two scores within this distance are
 * considered tied and the winner is selected uniformly at random from
 * the tied set.
 */
const TIE_EPSILON = 1e-9;

export interface ScoredCandidate {
  item: ContentItem;
  theme: number;
  mech: number;
  age: number;
  combined: number;
}

/**
 * Pick the argmax over `pool` using `scoreFn`, breaking ties uniformly
 * via `rng`. Returns the index in `pool` of the chosen candidate.
 */
export function argmaxWithTieBreak(
  pool: ScoredCandidate[],
  scoreFn: (c: ScoredCandidate) => number,
  rng: () => number,
): number {
  let bestScore = -Infinity;
  let tied: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    const s = scoreFn(pool[i]);
    if (s > bestScore + TIE_EPSILON) {
      bestScore = s;
      tied = [i];
    } else if (Math.abs(s - bestScore) <= TIE_EPSILON) {
      // Track the running max precisely — without this nudge, a slowly
      // drifting sequence of near-equal scores would never refresh
      // bestScore and we would compare future scores against a stale
      // anchor.
      if (s > bestScore) bestScore = s;
      tied.push(i);
    }
  }
  if (tied.length === 1) return tied[0];
  const pick = Math.floor(rng() * tied.length);
  // Guard against rng() returning exactly 1.0 (Math.random does not, but
  // a custom rng might).
  const safePick = pick >= tied.length ? tied.length - 1 : pick;
  return tied[safePick];
}

/**
 * Recommend four content items for the given source, one per slot.
 *
 * Algorithm (see T04 PLAN):
 *   1. Filter the source item out of the candidate pool.
 *   2. Score every remaining candidate on theme / mech / age.
 *   3. Without replacement, in order, pick:
 *        slot1 = argmax(W_T·theme + W_M·mech + W_A·age)
 *        slot2 = argmax(W_T·theme - W_M·mech + W_A·age)
 *        slot3 = argmax(W_M·mech - W_T·theme + W_A·age)
 *        slot4 = uniform random pick from the residual
 *   4. Tie-break each argmax uniformly via `rng` (default Math.random).
 *
 * @throws InsufficientCandidatesError if fewer than 4 candidates remain
 *   after filtering the source.
 */
export function recommend(
  source: ContentItem,
  candidates: ContentItem[],
  weights: Weights = DEFAULT_WEIGHTS,
  rng: () => number = Math.random,
): Recommendation[] {
  const wT = weights.theme;
  const wM = weights.mech;
  const wA = weights.age;

  // Filter out the source by id (defensive — pointer equality would be
  // brittle if callers rebuild items).
  const filtered = candidates.filter((c) => c.id !== source.id);
  if (filtered.length < 4) {
    throw new InsufficientCandidatesError(filtered.length);
  }

  // IDF is a corpus-wide statistic — compute it from the full candidate
  // pool (including the source) so theme/tags weighting reflects the
  // whole dataset's rarity distribution, not just the residual pool.
  const idf = {
    theme: computeIdf(candidates, 'theme'),
    tags: computeIdf(candidates, 'tags'),
  };

  const scored: ScoredCandidate[] = filtered.map((item) => {
    const theme = themeScore(source, item, idf);
    const mech = mechScore(source, item);
    const age = ageScore(source, item);
    const combined = wT * theme + wM * mech + wA * age;
    return { item, theme, mech, age, combined };
  });

  const remaining = scored.slice();
  const out: Recommendation[] = [];

  const toRecommendation = (
    slot: SlotName,
    c: ScoredCandidate,
  ): Recommendation => ({
    slot,
    item: c.item,
    scores: {
      theme: c.theme,
      mech: c.mech,
      age: c.age,
      combined: c.combined,
    },
  });

  // Slot 1: overall best
  const i1 = argmaxWithTieBreak(
    remaining,
    (c) => wT * c.theme + wM * c.mech + wA * c.age,
    rng,
  );
  out.push(toRecommendation('theme_mech_match', remaining[i1]));
  remaining.splice(i1, 1);

  // Slot 2: theme-match / mech-diff
  const i2 = argmaxWithTieBreak(
    remaining,
    (c) => wT * c.theme - wM * c.mech + wA * c.age,
    rng,
  );
  out.push(toRecommendation('theme_match_mech_diff', remaining[i2]));
  remaining.splice(i2, 1);

  // Slot 3: mech-match / theme-diff
  const i3 = argmaxWithTieBreak(
    remaining,
    (c) => wM * c.mech - wT * c.theme + wA * c.age,
    rng,
  );
  out.push(toRecommendation('mech_match_theme_diff', remaining[i3]));
  remaining.splice(i3, 1);

  // Slot 4: uniform random from residual
  const i4Raw = Math.floor(rng() * remaining.length);
  const i4 = i4Raw >= remaining.length ? remaining.length - 1 : i4Raw;
  out.push(toRecommendation('random', remaining[i4]));

  return out;
}
