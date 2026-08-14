import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { loadContent } from './data/loader.js';
import { parseRequest } from './validation/input-validator.js';
import { recommend, DEFAULT_WEIGHTS } from './scoring/recommender.js';
import type { Weights, Recommendation } from './scoring/recommender.js';
// NOTE you'll also need to import InsufficientCandidatesError once you implement recommendFromGamesPlayed
import { InsufficientCandidatesError, argmaxWithTieBreak, ScoredCandidate, SlotName} from "./scoring/recommender.js";
import { ageScore, themeScore, mechScore, type ThemeIdf } from './scoring/dimensions.js';
import { computeIdf } from './scoring/idf.js';
import type { ContentItem } from './models/content-item.js';
import { resolveWeights } from './config/weights.js';
import { mapError } from './errors/error-mapper.js';
import { NotFoundError } from './errors/not-found-error.js';
import {
  buildHealth,
  buildWarmup,
  buildSuccess,
} from './responses/response-builder.js';
import { logger } from './logging/logger.js';

/**
 * `GET /recommendations` entrypoint. Composes request parsing, the
 * cached dataset loader, the pure scoring core, and error mapping into
 * the single async handler API Gateway invokes.
 *
 * `health=true` and `warmup=true` short-circuit before the dataset is
 * touched. All thrown errors — typed or not — are funnelled through
 * `mapError` so every response, success or failure, carries the
 * documented JSON + CORS shape.
 */
export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const request = parseRequest(event);

    if (request.kind === 'health') {
      logger.info('Health check', { kind: 'health' });
      return buildHealth();
    }
    if (request.kind === 'warmup') {
      logger.info('Warmup invocation', { kind: 'warmup' });
      return buildWarmup();
    }

    const content = loadContent(process.env.HANDLER_FIXTURE_JSON);
    const source = content.find((item) => item.id === request.id);
    if (!source) {
      throw new NotFoundError(request.id);
    }

    const weights = resolveWeights(process.env.RECOMMENDATION_WEIGHTS);
    const recommendations = recommend(source, content, weights);

    logger.info('Recommendations generated', {
      sourceId: source.id,
      slots: recommendations.map((r) => r.slot),
    });

    return buildSuccess(source.id, recommendations);
  } catch (err) {
    logger.error('Request failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return mapError(err);
  }
}

// -----------------------------------------------------------------------------
// Composite (multi-item) recommendations
// -----------------------------------------------------------------------------

/**
 * A user's recent play history, ordered OLDEST-first (index 0 = earliest
 * play; last index = most recently played game).
 */
export type GamesPlayed = ContentItem[];

/**
 * Per-candidate similarity scores after averaging ("average pooling")
 * across every game in the windowed play history. Mirrors
 * RecommendationScores in scoring/recommender.ts, but keep in mind each field here is
 * an average across N source games, not a score against one!
 */
export interface CompositeScores {
  theme: number;
  mech: number;
  age: number;
  combined: number;
}

/**
 * Max games accepted in a single request's play history. Protects the
 * Lambda from scoring against an unbounded upload — this is a REQUEST
 * guard, not the math window (see COMPOSITE_WINDOW_SIZE).
 * 25 here is a placeholder.
 */
export const MAX_GAMES_PLAYED = 25;

/**
 * Cap on how many of the MOST RECENT games in the history feed the
 * composite score, independent of MAX_GAMES_PLAYED.
 */
export const COMPOSITE_WINDOW_SIZE = 7;

/** Thrown when a caller submits more games than the service will score in one request.
 * Resist the urge to refactor the errors into the Errors Directory!
 */
export class TooManyGamesPlayedError extends Error {
  readonly submitted: number;
  readonly max: number;
  constructor(submitted: number, max: number) {
    super(`Too many games played: submitted ${submitted}, max allowed is ${max}.`);
    this.name = 'TooManyGamesPlayedError';
    this.submitted = submitted;
    this.max = max;
  }
}

/** Thrown when a caller submits an empty play history */
export class EmptyGamesPlayedError extends Error {
  constructor() {
    super('gamesPlayed must contain at least one ContentItem.');
    this.name = 'EmptyGamesPlayedError';
  }
}


/**
 * Guard against oversized/empty play-history uploads. Call this FIRST in
 * the composite flow, before any scoring work happens.
 *
 * TODO: implementation hint
 *  - Throw EmptyGamesPlayedError if gamesPlayed.length === 0.
 *  - Throw TooManyGamesPlayedError if gamesPlayed.length > maxAllowed.
 *  - Otherwise return (no exception = valid).
 */

export function assertGamesPlayedWithinLimit(
  gamesPlayed: GamesPlayed,
  maxAllowed: number = MAX_GAMES_PLAYED,
): void {
  if (gamesPlayed.length === 0) {
    throw new EmptyGamesPlayedError();
  }
  if (gamesPlayed.length > maxAllowed) {
    throw new TooManyGamesPlayedError(gamesPlayed.length, maxAllowed);
  }
}

/**
 * Returns the most recent `windowSize` games from `gamesPlayed`. If
 * gamesPlayed.length <= windowSize, returns every game played (order
 * preserved) — nothing is dropped early in a session.
 *
 * TODO: implementation hint.
 *  - Assumes oldest-first ordering (see GamesPlayed).
 *  - Must NOT mutate the input array.
 *  - Decide + test what happens if windowSize <= 0.
 */
export function windowGamesPlayed(
  gamesPlayed: GamesPlayed,
  windowSize: number = COMPOSITE_WINDOW_SIZE,
): GamesPlayed {
  if (!Number.isFinite(windowSize) || windowSize <= 0) {
    return [];
  }
  return gamesPlayed.slice(-windowSize);
}

/**
 * Scores `candidate` against EACH game in `windowedHistory` separately
 * (reuse themeScore/mechScore/ageScore from scoring/dimensions.ts), then
 * averages those per-game scores ("average pooling" — chosen over max
 * pooling per the windowing investigation).
 *
 * IMPORTANT: this is NOT the same as merging the window's theme/tag/etc.
 * sets into one big set and scoring once against that union — Jaccard is
 * not linear under union, so the two approaches give different numbers.
 * Score-per-game-then-average is the required approach; there's a test
 * that will fail if you union instead.
 *
 * TODO: implementation hint.
 *  - windowedHistory must not be empty so decide whether to guard
 *    here or the guard in the caller is sufficient.
 */
export function computeCompositeScores(
  windowedHistory: GamesPlayed,
  candidate: ContentItem,
  weights: Weights,
  idf: ThemeIdf,
): CompositeScores {
  if (!Number.isFinite(windowedHistory.length) || windowedHistory.length === 0) {
    return {
      theme: 0,
      mech: 0,
      age: 0,
      combined: 0,
    };
  }

  let themeTotal = 0;
  let mechTotal = 0;
  let ageTotal = 0;

  for (const game of windowedHistory) {
    themeTotal += themeScore(game, candidate, idf);
    mechTotal += mechScore(game, candidate);
    ageTotal += ageScore(game, candidate);
  }

  const count = windowedHistory.length;
  const themeAvg = (themeTotal / count);
  const mechAvg = (mechTotal / count) ;
  const ageAvg = (ageTotal / count);
  const combinedAvg = weights.theme * themeAvg + 
                      weights.mech * mechAvg + 
                      weights.age * ageAvg;

  return { 
    theme: themeAvg, 
    mech: mechAvg,
    age: ageAvg,
    combined: combinedAvg };
}
/**
 * Composite-history analogue of scoring/recommender.ts's recommend():
 * scores candidates against an averaged profile built from a whole play
 * history, instead of against one source item.
 *
 * TODO(intern): implementation hint
 *  1. assertGamesPlayedWithinLimit(gamesPlayed, maxAllowed) — fail fast.
 *  2. windowGamesPlayed(gamesPlayed) — cap what feeds the math.
 *  3. Candidate pool = every item in `candidates` whose id is NOT in the
 *     FULL gamesPlayed history (not just the window — a game that aged
 *     out of the window must still never be re-recommended).
 *  4. Compute idf once from `candidates` (check how recommend() does it).
 *  5. computeCompositeScores() for every remaining candidate.
 *  6. Select the same 4 slots recommend() uses — theme_mech_match,
 *     theme_match_mech_diff, mech_match_theme_diff, random — without
 *     replacement, using composite scores in place of single-source
 *     scores. OK to duplicate recommend()'s tie-break logic here for
 *     now; it gets unified in the refactor phase.
 *  7. Throw InsufficientCandidatesError if fewer than 4 candidates remain.
 */
export function recommendFromGamesPlayed(
  gamesPlayed: GamesPlayed,
  candidates: ContentItem[],
  weights: Weights = DEFAULT_WEIGHTS,
  rng: () => number = Math.random,
  maxAllowed: number = MAX_GAMES_PLAYED,
): Recommendation[] {

  const wT = weights.theme;
  const wA = weights.age;
  const wM = weights.mech;

  assertGamesPlayedWithinLimit(gamesPlayed, maxAllowed);
  
  const windowedHistory = windowGamesPlayed(gamesPlayed);
  const fullHistoryIds = new Set(gamesPlayed.map(game => game.id));
  const candidatePool = candidates.filter((game)=>!fullHistoryIds.has(game.id));
  
  if (candidatePool.length < 4){
    throw new InsufficientCandidatesError(candidatePool.length);
  }

  const idf = {
    theme: computeIdf(candidates, 'theme'),
    tags: computeIdf(candidates, 'tags'),
  };

  const scoreCandidates: ScoredCandidate[] = []; 
  const out: Recommendation[] = [];

  for (const candidate of candidatePool){
    const score = computeCompositeScores (
      windowedHistory, 
      candidate, 
      weights, 
      idf
    );

    scoreCandidates.push ({
      item: candidate,
      theme: score.theme,
      mech: score.mech,
      age: score.age,
      combined: score.combined
    }); 
  } 

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
  
    


  //slot 1: theme-match / mech-match
   const i1 = argmaxWithTieBreak(
    scoreCandidates,
    (c) => wT * c.theme + wM * c.mech + wA * c.age,
    rng,
  );
  out.push(toRecommendation('theme_mech_match', scoreCandidates[i1]));
  scoreCandidates.splice(i1, 1);

  // Slot 2: theme-match / mech-diff
  const i2 = argmaxWithTieBreak(
    scoreCandidates,
    (c) => wT * c.theme - wM * c.mech + wA * c.age,
    rng,
  );
  out.push(toRecommendation('theme_match_mech_diff', scoreCandidates[i2]));
  scoreCandidates.splice(i2, 1);

  // Slot 3: mech-match / theme-diff
  const i3 = argmaxWithTieBreak(
    scoreCandidates,
    (c) => wM * c.mech - wT * c.theme + wA * c.age,
    rng,
  );
  out.push(toRecommendation('mech_match_theme_diff', scoreCandidates[i3]));
  scoreCandidates.splice(i3, 1);

  // Slot 4: uniform random from residual
  const i4Raw = Math.floor(rng() * scoreCandidates.length);
  const i4 = i4Raw >= scoreCandidates.length ? scoreCandidates.length - 1 : i4Raw;
  out.push(toRecommendation('random', scoreCandidates[i4]));

  return out;
}
