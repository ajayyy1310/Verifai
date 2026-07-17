/**
 * Verifai Verifier — Claim extraction and entity comparison logic
 *
 * Handles:
 * 1. Fine-grained claim extraction (splits on conjunctions, not just sentences)
 * 2. Strict number comparison (500 ≠ 350, no tolerance)
 * 3. Entity overlap calculation with number-aware matching
 */
/**
 * Extract claims from text by splitting on:
 * - Sentence boundaries (. ! ?)
 * - Coordinating conjunctions with independent clauses (and, but, however, etc.)
 * - Semicolons and colons
 *
 * Filters out fragments < 15 characters.
 */
export declare function extractClaims(text: string): string[];
/**
 * Extract all numbers from text, normalized (no commas).
 * Returns array of integers.
 */
export declare function extractNumbers(text: string): number[];
/**
 * Compare numbers in claim vs. source.
 * Returns matched numbers (exact value match), claim-only, source-only.
 */
export type NumberComparison = {
    matched: number[];
    claimOnly: number[];
    sourceOnly: number[];
};
/**
 * Result of verifying a single claim against sources.
 */
export type ClaimResult = {
    score: number;
    supported: boolean;
    entityRatio: number;
    numberMatch: boolean;
};
export declare function compareNumbers(claim: string, source: string): NumberComparison;
/**
 * Extract named entities (company names, locations, people) from text.
 * Simple heuristic: capitalized words and multi-word phrases.
 */
export declare function extractEntities(text: string): string[];
/**
 * Verify a single claim against sources.
 * Returns: { supported: boolean, entityRatio: number, numberMatch: boolean }
 */
export declare function verifyClaimAgainstSource(claim: string, sources: string[]): {
    supported: boolean;
    entityRatio: number;
    numberMatch: boolean;
    details: {
        claimEntities: string[];
        sourceEntities: string[];
        matchedEntities: string[];
        numberComparison: ReturnType<typeof compareNumbers>;
    };
};
/**
 * Compute trust score for agent output against sources.
 * Uses fine-grained claim extraction and strict number comparison.
 */
export declare function computeTrustScore(agentOutput: string, sources: string[]): {
    score: number;
    verdict: 'PASS' | 'BLOCK';
    mismatches: Array<{
        claim: string;
        sourceText: string;
        issue: string;
    }>;
    claimDetails: Array<{
        claim: string;
        supported: boolean;
        entityRatio: number;
        numberMatch: boolean;
    }>;
};
//# sourceMappingURL=verifier.d.ts.map