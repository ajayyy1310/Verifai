import { ClaimResult } from './verifier.js';

export interface ScoreResult {
  trustScore: number;
  verdict: 'PASS' | 'BLOCK';
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
  const trustScore = supportedCount / claimResults.length;

  const verdict: 'PASS' | 'BLOCK' = trustScore >= 0.7 ? 'PASS' : 'BLOCK';

  return {
    trustScore,
    verdict
  };
}
