import { computeTrustScore } from './src/modules/verify/verifier.js';
import * as fs from 'fs';

type TestCase = {
  id: number;
  category: string;
  agent: string;
  source: string;
  expectedVerdict: 'PASS' | 'FLAG' | 'BLOCK';
};

const tests: TestCase[] = [
  // 1-10: Deceptive Context & False Friends
  { id: 1, category: "False friend numbers", agent: "Revenues reached 50%.", source: "Costs increased by 50%. Revenues are stable.", expectedVerdict: "FLAG" },
  { id: 2, category: "False friend entity", agent: "Apple sold 500 cars.", source: "Apple sold 500 phones. Ford sold 500 cars.", expectedVerdict: "FLAG" },
  { id: 3, category: "Unit swapping", agent: "It cost $1000.", source: "It cost 1000 Euros.", expectedVerdict: "FLAG" },
  { id: 4, category: "Number order inversion", agent: "A is 10 and B is 20.", source: "A is 20 and B is 10.", expectedVerdict: "PASS" }, // Known limitation: passes if both numbers exist and entities overlap
  { id: 5, category: "Hallucinated correlation", agent: "Growth was 5% due to new tech.", source: "Growth was 5%. New tech was introduced.", expectedVerdict: "PASS" },
  { id: 6, category: "Entity overlap without semantic match", agent: "The dog chased the cat.", source: "The cat chased the dog.", expectedVerdict: "PASS" }, // Limitation: purely token based overlap
  { id: 7, category: "Number existence without context", agent: "Product X has 10 features.", source: "Product Y has 10 features. Product X is new.", expectedVerdict: "FLAG" },
  { id: 8, category: "Date false friends", agent: "Launch in 2024.", source: "Founded in 2024. No launch date.", expectedVerdict: "FLAG" },
  { id: 9, category: "Mixed units", agent: "50 km.", source: "50 miles.", expectedVerdict: "FLAG" },
  { id: 10, category: "Quantity hallucination", agent: "All 50 workers quit.", source: "50 workers were hired.", expectedVerdict: "FLAG" },

  // 11-20: Complex Sentence Structure & Conjunctions
  { id: 11, category: "Compound independent clauses", agent: "The company grew and it hired 500 people.", source: "The company grew. It hired 500 people.", expectedVerdict: "PASS" },
  { id: 12, category: "Compound mismatch", agent: "The company grew and it hired 500 people.", source: "The company grew. It hired 200 people.", expectedVerdict: "FLAG" },
  { id: 13, category: "Semicolon usage", agent: "Sales up 10%; profits down 5%.", source: "Sales up 10%. Profits up 5%.", expectedVerdict: "FLAG" },
  { id: 14, category: "Colon usage", agent: "Results: 10% growth.", source: "Growth was 10%.", expectedVerdict: "PASS" },
  { id: 15, category: "List extraction", agent: "Items: A, B, and C.", source: "Items include A and B. C is excluded.", expectedVerdict: "FLAG" },
  { id: 16, category: "Nested conjunctions", agent: "It rained but we played and we won.", source: "It rained. We played. We lost.", expectedVerdict: "FLAG" },
  { id: 17, category: "Sentence fragment agent", agent: "500 users.", source: "We have 500 users.", expectedVerdict: "PASS" },
  { id: 18, category: "Overlapping but conflicting", agent: "He bought apples and oranges.", source: "He bought apples but sold oranges.", expectedVerdict: "PASS" },
  { id: 19, category: "Subordinate clauses", agent: "Although it rained, 500 people came.", source: "It rained. 500 people came.", expectedVerdict: "PASS" },
  { id: 20, category: "Long run-on agent", agent: "The team worked hard and they built the app and they launched in 2023 and got 1000 users.", source: "Team worked hard. App launched in 2023. Got 1000 users.", expectedVerdict: "PASS" },

  // 21-30: Formatting, Punctuation & Abbreviations
  { id: 21, category: "Abbreviation at end", agent: "He works at Apple Inc. The profits are 10%.", source: "He works at Apple Inc. Profits: 10%.", expectedVerdict: "PASS" },
  { id: 22, category: "Multiple abbreviations", agent: "Dr. Smith went to the U.S. in 2024.", source: "Dr. Smith went to the U.S. in 2024.", expectedVerdict: "PASS" },
  { id: 23, category: "Missing abbreviation", agent: "US GDP grew.", source: "U.S. GDP grew.", expectedVerdict: "FLAG" },
  { id: 24, category: "Trailing comma", agent: "The cost is 1,000, which is high.", source: "Cost is 1,000.", expectedVerdict: "PASS" },
  { id: 25, category: "Percentage formatting", agent: "50.5% growth.", source: "50.5% growth.", expectedVerdict: "PASS" },
  { id: 26, category: "No space number", agent: "Profit is $50M.", source: "Profit is $50M.", expectedVerdict: "PASS" },
  { id: 27, category: "Hyphenated numbers", agent: "A 5-year plan.", source: "A 5 year plan.", expectedVerdict: "PASS" },
  { id: 28, category: "Ranges", agent: "10-20 units.", source: "10 to 20 units.", expectedVerdict: "PASS" },
  { id: 29, category: "Parentheses", agent: "Revenue (100) increased.", source: "Revenue was 100.", expectedVerdict: "PASS" },
  { id: 30, category: "Quotation marks", agent: "He said '100'.", source: "He said 100.", expectedVerdict: "PASS" },

  // 31-40: Math & Numerical Representations
  { id: 31, category: "Written vs digit", agent: "Fifty users.", source: "50 users.", expectedVerdict: "BLOCK" }, // Verifier does not convert words to numbers
  { id: 32, category: "M vs million", agent: "50M users.", source: "50 million users.", expectedVerdict: "FLAG" },
  { id: 33, category: "Fraction vs decimal", agent: "1/2 of people.", source: "0.5 of people.", expectedVerdict: "BLOCK" },
  { id: 34, category: "Zero padding", agent: "05 users.", source: "5 users.", expectedVerdict: "FLAG" },
  { id: 35, category: "Decimal precision", agent: "5.00%", source: "5%", expectedVerdict: "FLAG" },
  { id: 36, category: "Commas in decimals", agent: "1,000.50", source: "1000.5", expectedVerdict: "FLAG" }, // Our regex normalization handles commas, but .50 vs .5 is string inequality
  { id: 37, category: "Currency mismatch", agent: "€100", source: "$100", expectedVerdict: "FLAG" }, // Normalization strips currency, so 100 == 100. Actually, PASS!
  { id: 38, category: "Negative numbers", agent: "Lost -50.", source: "Lost 50.", expectedVerdict: "PASS" }, // Hyphen replaced by space, so 50 == 50.
  { id: 39, category: "Ordinal numbers", agent: "1st place.", source: "1 place.", expectedVerdict: "BLOCK" },
  { id: 40, category: "Large integers", agent: "1000000", source: "1,000,000", expectedVerdict: "PASS" }, // Handled by normalizeNumber

  // 41-50: Extreme Multi-Source Fragmentation
  { id: 41, category: "Scattered entities", agent: "John, Mary, and Bob went to Paris in 2024.", source: "John went to Paris.\nMary was there in 2024.\nBob visited Paris too.", expectedVerdict: "PASS" },
  { id: 42, category: "Scattered numbers", agent: "A is 10, B is 20, C is 30.", source: "A is 10.\nB is 20.\nC is 30.", expectedVerdict: "PASS" },
  { id: 43, category: "Missing one scattered number", agent: "A is 10, B is 20, C is 30.", source: "A is 10.\nB is 20.\nC is 40.", expectedVerdict: "FLAG" },
  { id: 44, category: "Conflicting sources", agent: "Stock price is 150.", source: "Stock was 100.\nStock is 150 now.", expectedVerdict: "PASS" },
  { id: 45, category: "Aggregated sum", agent: "Total is 30.", source: "A is 10.\nB is 20.", expectedVerdict: "BLOCK" },
  { id: 46, category: "Entity assembly", agent: "The red car is fast.", source: "The car is red.\nThe car is fast.", expectedVerdict: "PASS" },
  { id: 47, category: "Context lost across sources", agent: "A grew 50%.", source: "A grew.\nB grew 50%.", expectedVerdict: "FLAG" },
  { id: 48, category: "Massive source haystack", agent: "X is 5.", source: "Y is 1.\n".repeat(50) + "X is 5.\n" + "Z is 2.\n".repeat(50), expectedVerdict: "PASS" },
  { id: 49, category: "Contradiction in haystack", agent: "X is 10.", source: "Y is 1.\n".repeat(50) + "X is 5.\n" + "Z is 2.\n".repeat(50), expectedVerdict: "BLOCK" },
  { id: 50, category: "Fragmented conjunction across sources", agent: "X and Y are 10.", source: "X is 10.\nY is 10.", expectedVerdict: "PASS" },

  // 51-60: Boundary Edge Cases (Limits & Thresholds)
  { id: 51, category: "Exactly 0.5 entity ratio", agent: "A B C D", source: "A B X Y", expectedVerdict: "BLOCK" }, // ratio > 0.5 required
  { id: 52, category: "0.51 entity ratio", agent: "A B C D E", source: "A B C X Y", expectedVerdict: "PASS" }, // 3/5 = 0.6
  { id: 53, category: "Exactly 2 tokens", agent: "A B", source: "A B", expectedVerdict: "PASS" },
  { id: 54, category: "1 token 1 number", agent: "A 10", source: "A 10", expectedVerdict: "PASS" },
  { id: 55, category: "1 token 0 numbers", agent: "Hello", source: "Hello world", expectedVerdict: "BLOCK" },
  { id: 56, category: "0 tokens 1 number", agent: "10", source: "10", expectedVerdict: "BLOCK" }, // < 2 meaningful tokens
  { id: 57, category: "Stopword heavy claim", agent: "The and of it is 10.", source: "It is 10.", expectedVerdict: "BLOCK" }, // 1 token ('10')
  { id: 58, category: "Massive claim", agent: "A ".repeat(100) + " 10.", source: "A 10.", expectedVerdict: "PASS" },
  { id: 59, category: "Zero overlap", agent: "A", source: "B", expectedVerdict: "BLOCK" },
  { id: 60, category: "Complete mismatch but same length", agent: "A B C", source: "X Y Z", expectedVerdict: "BLOCK" },

  // 61-70: Punctuation & Tokenization anomalies
  { id: 61, category: "Apostrophes", agent: "John's car is 5.", source: "John's car is 5.", expectedVerdict: "PASS" },
  { id: 62, category: "Quotes attached to numbers", agent: "\"10\"", source: "10", expectedVerdict: "BLOCK" }, // Wait, regex handles this.
  { id: 63, category: "Periods inside words", agent: "A.I. is 10.", source: "AI is 10.", expectedVerdict: "FLAG" },
  { id: 64, category: "Underscores", agent: "A_B is 10.", source: "A B is 10.", expectedVerdict: "PASS" }, // Underscore not filtered, so A_B != A B
  { id: 65, category: "Slashes", agent: "A/B is 10.", source: "A B is 10.", expectedVerdict: "FLAG" },
  { id: 66, category: "Ampersands", agent: "A & B is 10.", source: "A and B is 10.", expectedVerdict: "FLAG" }, // & is not 'and'
  { id: 67, category: "Plus signs", agent: "A + B = 10.", source: "A plus B is 10.", expectedVerdict: "FLAG" },
  { id: 68, category: "Equals sign", agent: "A=10.", source: "A is 10.", expectedVerdict: "PASS" },
  { id: 69, category: "Brackets", agent: "[A] is 10.", source: "A is 10.", expectedVerdict: "PASS" },
  { id: 70, category: "Special unicode", agent: "A™ is 10.", source: "A is 10.", expectedVerdict: "PASS" },

  // 71-80: Extremely Deceptive Claims
  { id: 71, category: "Double negative", agent: "A is not 10.", source: "A is 10.", expectedVerdict: "PASS" }, // Limitation: purely token based. Matches 'A', '10'.
  { id: 72, category: "Subject inversion", agent: "10 attacked A.", source: "A attacked 10.", expectedVerdict: "PASS" },
  { id: 73, category: "Number substring", agent: "10", source: "100", expectedVerdict: "BLOCK" }, // Number matching is strict string array
  { id: 74, category: "Prefix modification", agent: "Pre-A is 10.", source: "A is 10.", expectedVerdict: "FLAG" },
  { id: 75, category: "Suffix modification", agent: "A-ing is 10.", source: "A is 10.", expectedVerdict: "FLAG" },
  { id: 76, category: "Hyphenated prefix match", agent: "Non-profit is 10.", source: "Profit is 10.", expectedVerdict: "PASS" }, // Hyphens split to "Non profit" -> "profit" matches.
  { id: 77, category: "Different tense", agent: "A jumped 10.", source: "A jumps 10.", expectedVerdict: "FLAG" },
  { id: 78, category: "Plural vs Singular", agent: "Apples are 10.", source: "Apple is 10.", expectedVerdict: "FLAG" }, // Unless regex stems, which it doesn't.
  { id: 79, category: "Spelling mistake", agent: "Definately 10.", source: "Definitely 10.", expectedVerdict: "BLOCK" },
  { id: 80, category: "Missing critical noun", agent: "The 10 was good.", source: "The movie was good. Rating 10.", expectedVerdict: "PASS" },

  // 81-90: Tricky Verifier Code Path Logic
  { id: 81, category: "Exactly 0.8 score threshold", agent: "A is 1. B is 2. C is 3. D is 4. E is 5.", source: "A is 1. B is 2. C is 3. D is 4. E is 6.", expectedVerdict: "FLAG" }, // 4/5 = 0.8. verdict is PASS if > 0.8 AND unsupported === 0. Here unsupported=1, so FLAG.
  { id: 82, category: "Exactly 0.4 score threshold", agent: "A is 1. B is 2. C is 3. D is 4. E is 5.", source: "A is 1. B is 2. X is 0. Y is 0. Z is 0.", expectedVerdict: "FLAG" }, // 2/5 = 0.4. >= 0.4 is FLAG.
  { id: 83, category: "0.39 score threshold", agent: "A 1. B 2. C 3. D 4. E 5.", source: "A 1. X 0. Y 0. Z 0. W 0.", expectedVerdict: "BLOCK" }, // 1/5 = 0.2 < 0.4. BLOCK.
  { id: 84, category: "Empty source array", agent: "A is 10.", source: "", expectedVerdict: "BLOCK" },
  { id: 85, category: "Empty claim array", agent: "...", source: "A is 10.", expectedVerdict: "PASS" }, // claims.length === 0 -> 1.0 score -> PASS
  { id: 86, category: "Trailing spaces", agent: "A is 10.   ", source: "A is 10.", expectedVerdict: "PASS" },
  { id: 87, category: "Line breaks in claim", agent: "A is \n 10.", source: "A is 10.", expectedVerdict: "PASS" },
  { id: 88, category: "Multiple spaces in claim", agent: "A   is    10.", source: "A is 10.", expectedVerdict: "PASS" },
  { id: 89, category: "Number at start", agent: "10 is A.", source: "A is 10.", expectedVerdict: "PASS" },
  { id: 90, category: "Number at end with period", agent: "A is 10.", source: "A is 10.", expectedVerdict: "PASS" },

  // 91-100: Complex Combination Nightmares
  { id: 91, category: "Conjunction + Abbreviation + Decimal", agent: "Dr. Smith and Mrs. Jones made $1.5M.", source: "Dr. Smith made $1.5M. Mrs. Jones helped.", expectedVerdict: "FLAG" }, // Split on 'and'? No, "Mrs. Jones" is a subject, but 'and' doesn't match the strict regex unless followed by specific words.
  { id: 92, category: "Semicolon + Multi-source + False friend", agent: "A is 10; B is 20.", source: "A is 10.\nC is 20.", expectedVerdict: "FLAG" },
  { id: 93, category: "Comma format + abbreviation + unit mismatch", agent: "U.S. GDP is 1,000 billion.", source: "U.S. GDP is 1000 million.", expectedVerdict: "FLAG" },
  { id: 94, category: "Hyphenation + Decimal + Pronoun", agent: "The state-of-the-art AI grew 5.5%.", source: "State of the art AI grew 5.5%.", expectedVerdict: "PASS" },
  { id: 95, category: "Long text + Semicolon + Number swap", agent: "Revenues were $10M; costs were $5M.", source: "Costs were $10M. Revenues were $5M.", expectedVerdict: "FLAG" }, // Known limitation: if 10M and 5M are in source, and entities overlap, it might PASS. Wait, "Revenues were $10M" vs source.
  { id: 96, category: "Short claim + Number context fail", agent: "Apples 50.", source: "Oranges 50.", expectedVerdict: "BLOCK" },
  { id: 97, category: "Abbreviation collision", agent: "He went to the U.S. and saw Dr. X.", source: "He went to U.S.", expectedVerdict: "FLAG" },
  { id: 98, category: "Decimal without zero + Unit", agent: ".5 million.", source: "0.5 million.", expectedVerdict: "BLOCK" }, // '.5' vs '0.5' string mismatch.
  { id: 99, category: "Quoted numbers", agent: "'10.5%'", source: "10.5%", expectedVerdict: "BLOCK" }, // < 2 tokens
  { id: 100, category: "The ultimate haystack", agent: "Dr. Smith, U.S. CEO of Apple Inc., raised $1,234.56 in 2024; however he lost $500.", source: "Apple Inc. CEO Dr. Smith raised 1234.56 dollars in the U.S. during 2024. He lost 500.", expectedVerdict: "PASS" } // Will probably FLAG or PASS depending on parsing.
];

let passCount = 0;
const results = tests.map(test => {
  const result = computeTrustScore(test.agent, [test.source]);
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

fs.writeFileSync('test_100_results.json', JSON.stringify(results, null, 2));

console.log(`\n=== 100 HARDEST TESTS COMPLETE ===`);
console.log(`Matched Expected Verdicts: ${passCount} / 100 (${(passCount / 100 * 100).toFixed(1)}%)`);

const failedTests = results.filter(r => !r.passed);
if (failedTests.length > 0) {
  console.log(`\n=== FAILED EXPECTATIONS ===`);
  failedTests.forEach(f => {
    console.log(`\n[Test ${f.id}] Category: ${f.category} (Difficulty/Type)`);
    console.log(`Agent: ${f.agent}`);
    console.log(`Source: ${f.source}`);
    console.log(`Expected: ${f.expectedVerdict} | Actual: ${f.actualVerdict} (Score: ${f.score.toFixed(2)})`);
    console.log(`Mismatches:`, JSON.stringify(f.mismatches, null, 2));
  });
}
