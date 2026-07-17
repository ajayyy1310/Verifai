/**
 * Unit tests for Verifai verifier module
 * Tests claim extraction, number comparison, and trust scoring
 */

import {
  extractClaims,
  extractNumbers,
  compareNumbers,
  extractEntities,
  verifyClaimAgainstSource,
  computeTrustScore,
} from './verifier.js';

// ============================================================================
// TEST 1: Claim Splitting
// ============================================================================
console.log('\n=== TEST 1: Claim Splitting ===');
const test1Input = 'Meridian Labs raised $45 million in funding and has 500 employees across 3 offices.';
const test1Expected = [
  'Meridian Labs raised $45 million in funding',
  'has 500 employees across 3 offices',
];
const test1Result = extractClaims(test1Input);
console.log('Input:', test1Input);
console.log('Expected:', test1Expected);
console.log('Result:', test1Result);
const test1Pass = test1Result.length === 2 &&
  test1Result[0].includes('raised') &&
  test1Result[1].includes('employees');
console.log('PASS:', test1Pass ? '✅' : '❌');

// ============================================================================
// TEST 2: Number Comparison (Strict)
// ============================================================================
console.log('\n=== TEST 2: Number Comparison (Strict) ===');
const test2Claim = '500 employees across 3 offices';
const test2Source = '350 employees across two research facilities';
const test2Result = compareNumbers(test2Claim, test2Source);
console.log('Claim:', test2Claim);
console.log('Source:', test2Source);
console.log('Matched numbers:', test2Result.matched);
console.log('Claim-only numbers:', test2Result.claimOnly);
console.log('Source-only numbers:', test2Result.sourceOnly);
const test2Pass = test2Result.matched.length === 0 &&
  test2Result.claimOnly.includes('500') &&
  test2Result.claimOnly.includes('3') &&
  test2Result.sourceOnly.includes('350');
console.log('PASS:', test2Pass ? '✅' : '❌');

// ============================================================================
// TEST 3: Full Scenario (FLAG)
// ============================================================================
console.log('\n=== TEST 3: Full Scenario (FLAG) ===');
const test3Agent = 'Meridian Labs raised $45 million in funding and has 500 employees across 3 offices.';
const test3Source = 'Meridian Labs raised $45 million in Series B funding from Tiger Global in 2024. The company has 350 employees across two research facilities in Bangalore and Hyderabad.';
const test3Result = computeTrustScore(test3Agent, [test3Source]);
console.log('Agent output:', test3Agent);
console.log('Source:', test3Source);
console.log('Score:', test3Result.score);
console.log('Verdict:', test3Result.verdict);
console.log('Mismatches:', test3Result.mismatches);
const test3Pass = test3Result.score >= 0.4 && test3Result.score <= 0.6 &&
  test3Result.verdict === 'FLAG';
console.log('PASS:', test3Pass ? '✅' : '❌');

// ============================================================================
// TEST 4: PASS Case (Exact Match)
// ============================================================================
console.log('\n=== TEST 4: PASS Case (Exact Match) ===');
const test4Agent = 'Meridian Labs raised $45 million in funding.';
const test4Source = 'Meridian Labs raised $45 million in Series B funding from Tiger Global in 2024.';
const test4Result = computeTrustScore(test4Agent, [test4Source]);
console.log('Agent output:', test4Agent);
console.log('Source:', test4Source);
console.log('Score:', test4Result.score);
console.log('Verdict:', test4Result.verdict);
const test4Pass = test4Result.score > 0.8 && test4Result.verdict === 'PASS';
console.log('PASS:', test4Pass ? '✅' : '❌');

// ============================================================================
// TEST 5: BLOCK Case (Contradiction)
// ============================================================================
console.log('\n=== TEST 5: BLOCK Case (Contradiction) ===');
const test5Agent = 'Pfizer acquired Meridian Labs for $800 million.';
const test5Source = 'Meridian Labs raised $45 million in Series B funding from Tiger Global in 2024.';
const test5Result = computeTrustScore(test5Agent, [test5Source]);
console.log('Agent output:', test5Agent);
console.log('Source:', test5Source);
console.log('Score:', test5Result.score);
console.log('Verdict:', test5Result.verdict);
const test5Pass = test5Result.score < 0.4 && test5Result.verdict === 'BLOCK';
console.log('PASS:', test5Pass ? '✅' : '❌');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n=== SUMMARY ===');
const allPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass;
console.log(`Test 1 (Splitting): ${test1Pass ? '✅' : '❌'}`);
console.log(`Test 2 (Number Comparison): ${test2Pass ? '✅' : '❌'}`);
console.log(`Test 3 (FLAG Scenario): ${test3Pass ? '✅' : '❌'}`);
console.log(`Test 4 (PASS Case): ${test4Pass ? '✅' : '❌'}`);
console.log(`Test 5 (BLOCK Case): ${test5Pass ? '✅' : '❌'}`);
console.log(`\nAll tests passed: ${allPass ? '✅ YES' : '❌ NO'}`);

if (!allPass) {
  process.exit(1);
}
