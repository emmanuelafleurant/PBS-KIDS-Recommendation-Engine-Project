import { DEFAULT_WEIGHTS, type Weights } from '../scoring/recommender.js';

/**
 * Resolve scoring weights from the RECOMMENDATION_WEIGHTS env var (or
 * any string source). Falls back to DEFAULT_WEIGHTS whenever the value
 * is missing, unparseable, or does not carry three numeric fields —
 * the handler should never fail cold-start on a malformed override.
 */
export function resolveWeights(envValue: string | undefined): Weights {
  if (envValue === undefined || envValue.trim() === '') {
    return DEFAULT_WEIGHTS;
  }
  try {
    const parsed: unknown = JSON.parse(envValue);
    if (parsed === null || typeof parsed !== 'object') {
      return DEFAULT_WEIGHTS;
    }
    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.theme === 'number' &&
      typeof candidate.mech === 'number' &&
      typeof candidate.age === 'number' &&
      Number.isFinite(candidate.theme) &&
      Number.isFinite(candidate.mech) &&
      Number.isFinite(candidate.age)
    ) {
      return {
        theme: candidate.theme,
        mech: candidate.mech,
        age: candidate.age,
      };
    }
    return DEFAULT_WEIGHTS;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}
