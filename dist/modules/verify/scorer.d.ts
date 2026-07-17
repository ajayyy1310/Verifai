import { ClaimResult } from './verifier.js';
export interface ScoreResult {
    trustScore: number;
    verdict: 'PASS' | 'BLOCK';
}
/**
 * Calculates aggregate trust score and verdict from individual claim results.
 * Uses the new ClaimResult shape: { score, supported, entityRatio, numberMatch }
 */
export declare function calculateTrustScore(claimResults: ClaimResult[]): ScoreResult;
//# sourceMappingURL=scorer.d.ts.map