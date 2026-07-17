import { computeTrustScore } from './src/modules/verify/verifier.js';
import * as fs from 'fs';

type TestCase = {
  id: number;
  difficulty: number;
  category: string;
  agent: string;
  source: string;
  expectedVerdict: 'PASS' | 'FLAG' | 'BLOCK';
};

const tests: TestCase[] = [
  // LEVEL 1: Easy Exact Matches
  { id: 1, difficulty: 1, category: "Exact Match", agent: "The company raised 45 million.", source: "The company raised 45 million.", expectedVerdict: "PASS" },
  { id: 2, difficulty: 1, category: "Exact Match with Name", agent: "John Doe visited Paris.", source: "John Doe visited Paris.", expectedVerdict: "PASS" },
  { id: 3, difficulty: 1, category: "Exact Match Numbers", agent: "Inflation is at 5.5%.", source: "Inflation is at 5.5%.", expectedVerdict: "PASS" },
  { id: 4, difficulty: 1, category: "Case Insensitive", agent: "apple reported 100 million.", source: "Apple reported 100 million.", expectedVerdict: "PASS" },
  { id: 5, difficulty: 1, category: "Trailing Punctuation", agent: "He won 5 medals!", source: "He won 5 medals.", expectedVerdict: "PASS" },

  // LEVEL 2: Simple Paraphrasing & Structure
  { id: 6, difficulty: 2, category: "Paraphrase", agent: "The revenue was $50 million.", source: "Total revenue hit $50 million this year.", expectedVerdict: "PASS" },
  { id: 7, difficulty: 2, category: "Number format", agent: "1,000 people attended.", source: "1000 people attended the event.", expectedVerdict: "PASS" },
  { id: 8, difficulty: 2, category: "Word reordering", agent: "In 2023, Tesla delivered 1.8 million cars.", source: "Tesla delivered 1.8 million cars in 2023.", expectedVerdict: "PASS" },
  { id: 9, difficulty: 2, category: "Subset extraction", agent: "SpaceX launched Falcon 9.", source: "Yesterday, SpaceX launched Falcon 9 successfully.", expectedVerdict: "PASS" },
  { id: 10, difficulty: 2, category: "Extra words in agent", agent: "The new startup successfully raised $10 million.", source: "The startup raised $10 million.", expectedVerdict: "PASS" }, // Wait, if agent has 'new' 'successfully', they are filtered or lower the ratio. Let's see if ratio > 0.5. 'startup', 'raised', 'million' match.

  // LEVEL 3: Hyphens, Decimals & Conjunctions
  { id: 11, difficulty: 3, category: "Hyphen handling", agent: "The state-of-the-art facility cost $5 million.", source: "The state of the art facility cost $5 million.", expectedVerdict: "PASS" },
  { id: 12, difficulty: 3, category: "Multiple decimals", agent: "Version 1.2.3 was released on 4.5.2023.", source: "Version 1.2.3 was released on 4.5.2023.", expectedVerdict: "PASS" },
  { id: 13, difficulty: 3, category: "Conjunction splitting", agent: "Google built a new campus and hired 500 engineers.", source: "Google built a new campus. It hired 500 engineers.", expectedVerdict: "PASS" },
  { id: 14, difficulty: 3, category: "Conjunction fail", agent: "Google built a new campus and hired 500 engineers.", source: "Google built a new campus. It hired 200 engineers.", expectedVerdict: "FLAG" },
  { id: 15, difficulty: 3, category: "Decimal without leading zero", agent: "Growth was .5%.", source: "Growth was 0.5%.", expectedVerdict: "PASS" }, // Actually .5 vs 0.5 might fail because our regex extracts ".5" and "0.5". But parseInt(".5") might be NaN. Let's see.

  // LEVEL 4: Edge Cases in Number Matching
  { id: 16, difficulty: 4, category: "False Number Match", agent: "Revenues grew by 5%.", source: "Revenues grew by 10%. We had 5 new products.", expectedVerdict: "FLAG" }, // "5" matches, but is it the right context? Verifier just checks if 5 is in source. So it will PASS! (Known limitation of regex matching)
  { id: 17, difficulty: 4, category: "Currency Symbols", agent: "Profit is ₹100 crore.", source: "Profit is 100 crore.", expectedVerdict: "PASS" },
  { id: 18, difficulty: 4, category: "Unit mismatch", agent: "100 million users.", source: "100 billion users.", expectedVerdict: "FLAG" }, // Our regex extracts "100 million" and "100 billion". They won't match!
  { id: 19, difficulty: 4, category: "Comma formatting", agent: "1,234,567 dollars.", source: "1234567 dollars.", expectedVerdict: "FLAG" }, // Wait, our regex extracts the commas as part of the string. So "1,234,567" != "1234567". It will FLAG.
  { id: 20, difficulty: 4, category: "Missing claim numbers", agent: "High revenue growth.", source: "Revenue grew 50%.", expectedVerdict: "PASS" }, // No numbers in claim -> passes if entities match.

  // LEVEL 5: Low Meaningful Tokens
  { id: 21, difficulty: 5, category: "Empty claim", agent: "Wow.", source: "Revenue grew 50%.", expectedVerdict: "BLOCK" }, // < 2 meaningful tokens -> unsupported.
  { id: 22, difficulty: 5, category: "Stopwords only", agent: "It is the.", source: "It is the company.", expectedVerdict: "BLOCK" }, // unsupported.
  { id: 23, difficulty: 5, category: "1 token only", agent: "Microsoft.", source: "Microsoft grew 5%.", expectedVerdict: "BLOCK" }, // < 2 tokens -> unsupported.
  { id: 24, difficulty: 5, category: "1 token 1 number", agent: "Microsoft 5", source: "Microsoft grew 5%.", expectedVerdict: "PASS" }, // 2 tokens!
  { id: 25, difficulty: 5, category: "Pronoun hallucination", agent: "He won 500.", source: "She won 500.", expectedVerdict: "BLOCK" }, // "He" is stopword. Token is "500". 1 token -> unsupported.

  // LEVEL 6: Multi-source Evidence
  { id: 26, difficulty: 6, category: "Multi-source exact", agent: "A is 1. B is 2.", source: "A is 1.\nB is 2.", expectedVerdict: "PASS" },
  { id: 27, difficulty: 6, category: "Multi-source fusion", agent: "Company X raised $10M from Y.", source: "Company X raised $10M.\nThe funding was from Y.", expectedVerdict: "PASS" },
  { id: 28, difficulty: 6, category: "Multi-source contradiction", agent: "X is 10.", source: "X is 5.\nX is 10.", expectedVerdict: "PASS" }, // 10 is found in one of the sources.
  { id: 29, difficulty: 6, category: "Multi-source number fusion", agent: "X is 10 and Y is 20.", source: "X is 10.\nY is 15.", expectedVerdict: "FLAG" }, // 20 missing
  { id: 30, difficulty: 6, category: "Multi-source entity fusion", agent: "X and Y went to Z.", source: "X went to Z.\nY stayed home.", expectedVerdict: "PASS" }, // X, Y, Z all present in sources.

  // LEVEL 7: Hallucinations & Distractors
  { id: 31, difficulty: 7, category: "Pure hallucination", agent: "Mars colonization starts in 2030.", source: "SpaceX launched a rocket.", expectedVerdict: "BLOCK" },
  { id: 32, difficulty: 7, category: "Entity hallucination", agent: "Apple launched iPhone 15.", source: "Samsung launched Galaxy S24.", expectedVerdict: "BLOCK" },
  { id: 33, difficulty: 7, category: "Number hallucination", agent: "Revenue was 900.", source: "Revenue was 100.", expectedVerdict: "BLOCK" },
  { id: 34, difficulty: 7, category: "Number combination hallucination", agent: "Total is 150.", source: "A is 100. B is 50.", expectedVerdict: "BLOCK" }, // Verifier doesn't do math. 150 is missing.
  { id: 35, difficulty: 7, category: "Subtle addition", agent: "He visited Paris and London.", source: "He visited Paris.", expectedVerdict: "FLAG" }, // Wait, if entities = Paris, London. Ratio = 1/2 = 0.5. Ratio > 0.5 is required! So 0.5 is NOT > 0.5 -> Unsupported -> BLOCK. (1 claim, 0 supported -> score 0 -> BLOCK).

  // LEVEL 8: Complex formatting
  { id: 36, difficulty: 8, category: "Abbreviations", agent: "U.S. GDP is 5%.", source: "US GDP is 5%.", expectedVerdict: "FLAG" }, // "U", "S", "GDP" vs "US", "GDP". Ratio 1/3 < 0.5 ? Let's see.
  { id: 37, difficulty: 8, category: "Percentage formats", agent: "fifty percent.", source: "50%.", expectedVerdict: "BLOCK" }, // "fifty" != "50".
  { id: 38, difficulty: 8, category: "Dates", agent: "Jan 1, 2024.", source: "January 1st, 2024.", expectedVerdict: "PASS" }, // "Jan" vs "January". Might fail entity match unless overlap is enough.
  { id: 39, difficulty: 8, category: "Mixed alphanumeric", agent: "Model-X15 cost $10.", source: "Model X15 cost $10.", expectedVerdict: "PASS" }, // Hyphens split Model X15.
  { id: 40, difficulty: 8, category: "Quoted text", agent: 'He said "Hello world".', source: "He said Hello world.", expectedVerdict: "PASS" },

  // LEVEL 9: Deep Structural Splits
  { id: 41, difficulty: 9, category: "Semicolon splits", agent: "A is 1; B is 2.", source: "A is 1.", expectedVerdict: "FLAG" }, // 2 claims. 1 passes, 1 fails. Score 0.5 -> FLAG.
  { id: 42, difficulty: 9, category: "Colon splits", agent: "Results: A is 1.", source: "A is 1.", expectedVerdict: "PASS" },
  { id: 43, difficulty: 9, category: "Multiple independent clauses", agent: "It rained heavily and the roads flooded, but we drove safely.", source: "It rained heavily. The roads flooded.", expectedVerdict: "FLAG" }, // 3 claims. 2 pass, 1 fails (drove safely). Score 0.66 -> FLAG.
  { id: 44, difficulty: 9, category: "Nested quotes", agent: "The report stated: 'Growth was 5%.'", source: "The report stated growth was 5%.", expectedVerdict: "PASS" },
  { id: 45, difficulty: 9, category: "Acronym vs Full", agent: "NASA launched.", source: "National Aeronautics and Space Administration launched.", expectedVerdict: "BLOCK" }, // Entity mismatch.

  // LEVEL 10: Extreme Edge Cases
  { id: 46, difficulty: 10, category: "Many numbers", agent: "1, 2, 3, 4, 5.", source: "1, 2, 3.", expectedVerdict: "BLOCK" },
  { id: 47, difficulty: 10, category: "Same numbers, wrong order", agent: "A is 10, B is 20.", source: "A is 20, B is 10.", expectedVerdict: "PASS" }, // Verifier only checks presence of numbers, not order. Known limitation.
  { id: 48, difficulty: 10, category: "Decimal boundaries", agent: "10.0.", source: "10.", expectedVerdict: "FLAG" }, // "10.0" != "10".
  { id: 49, difficulty: 10, category: "No space after punctuation", agent: "End.Start.", source: "End. Start.", expectedVerdict: "PASS" }, // Split on period handles this.
  { id: 50, difficulty: 10, category: "Massive text block", agent: "Summary of events.", source: "A".repeat(1000) + " Summary of events.", expectedVerdict: "PASS" },
];

let passCount = 0;
const results = tests.map(test => {
  const result = computeTrustScore(test.agent, test.source.split('\n'));
  const actualVerdict = result.verdict;
  const passed = actualVerdict === test.expectedVerdict;
  if (passed) passCount++;
  
  return {
    ...test,
    actualVerdict,
    score: result.score,
    passed,
    mismatches: result.mismatches
  };
});

fs.writeFileSync('test_50_results.json', JSON.stringify(results, null, 2));

console.log(`\n=== 50 TESTS COMPLETE ===`);
console.log(`Matched Expected Verdicts: ${passCount} / 50 (${(passCount / 50 * 100).toFixed(1)}%)`);

const failedTests = results.filter(r => !r.passed);
if (failedTests.length > 0) {
  console.log(`\n=== FAILED EXPECTATIONS ===`);
  failedTests.forEach(f => {
    console.log(`\n[Test ${f.id}] Category: ${f.category} (Difficulty: ${f.difficulty})`);
    console.log(`Agent: ${f.agent}`);
    console.log(`Source: ${f.source}`);
    console.log(`Expected: ${f.expectedVerdict} | Actual: ${f.actualVerdict} (Score: ${f.score.toFixed(2)})`);
    console.log(`Mismatches:`, JSON.stringify(f.mismatches, null, 2));
  });
}
