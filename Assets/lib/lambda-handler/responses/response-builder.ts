import type { APIGatewayProxyResult } from 'aws-lambda';
import type { Recommendation } from '../scoring/recommender.js';

const JSON_CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
} as const;

export interface RecommendationResponseItem {
  slot: Recommendation['slot'];
  id: string;
  title: string;
  type: 'game' | 'video';
  slug: string;
  scores: {
    theme: number;
    mech: number;
    age: number;
    combined: number;
  };
}

export interface RecommendationResponseBody {
  sourceId: string;
  recommendations: RecommendationResponseItem[];
}

export function buildSuccess(
  sourceId: string,
  recs: Recommendation[],
): APIGatewayProxyResult {
  const body: RecommendationResponseBody = {
    sourceId,
    recommendations: recs.map((r) => ({
      slot: r.slot,
      id: r.item.id,
      title: r.item.title,
      type: r.item.type,
      slug: r.item.slug,
      scores: {
        theme: r.scores.theme,
        mech: r.scores.mech,
        age: r.scores.age,
        combined: r.scores.combined,
      },
    })),
  };
  return {
    statusCode: 200,
    headers: { ...JSON_CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

export function buildError(
  status: number,
  code: string,
  message: string,
): APIGatewayProxyResult {
  return {
    statusCode: status,
    headers: { ...JSON_CORS_HEADERS },
    body: JSON.stringify({ error: { code, message } }),
  };
}

export function buildHealth(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: { ...JSON_CORS_HEADERS },
    body: JSON.stringify({ status: 'ok' }),
  };
}

export function buildWarmup(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: { ...JSON_CORS_HEADERS },
    body: JSON.stringify({ status: 'warm' }),
  };
}
