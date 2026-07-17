/**
 * Calculates aggregate trust score and verdict from individual claim results.
 * Uses the new ClaimResult shape: { score, supported, entityRatio, numberMatch }
 */
export function calculateTrustScore(claimResults) {
    if (claimResults.length === 0) {
        return {
            trustScore: 1.0,
            verdict: 'PASS'
        };
    }
    const supportedCount = claimResults.filter(r => r.supported).length;
    const trustScore = supportedCount / claimResults.length;
    const verdict = trustScore >= 0.7 ? 'PASS' : 'BLOCK';
    return {
        trustScore,
        verdict
    };
}
//# sourceMappingURL=scorer.js.map