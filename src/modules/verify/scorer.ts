import { ClaimResult } from './verifier.js';

export interface ScoreResult {
  trustScore: number;
  verdict: 'PASS' | 'BLOCK' | 'FLAG';
}

/**
 * Calculates aggregate trust score and verdict from individual claim results.
 * Uses the new ClaimResult shape: { score, supported, entityRatio, numberMatch }
 */
export function calculateTrustScore(claimResults: ClaimResult[]): ScoreResult {
  if (claimResults.length === 0) {
    return {
      trustScore: 1.0,
      verdict: 'PASS'
    };
  }

  const supportedCount = claimResults.filter(r => r.supported).length;
  const unsupportedCount = claimResults.length - supportedCount;
  const trustScore = supportedCount / claimResults.length;

  let verdict: 'PASS' | 'BLOCK' | 'FLAG';
  if (trustScore > 0.8 && unsupportedCount === 0) {
    verdict = 'PASS';
  } else if (trustScore < 0.4) {
    verdict = 'BLOCK';
  } else {
    verdict = 'FLAG';
  }

  return {
    trustScore,
    verdict
  };
}
