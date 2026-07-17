import { extractClaims, extractNumbers, computeTrustScore, compareNumbers } from './src/modules/verify/verifier.js';

console.log("=== BUG 1 TEST ===");
console.log(extractClaims("The repo rate was 6.5% and GDP grew 8.2% in FY2024."));

console.log("\n=== BUG 3 TEST ===");
console.log("compareNumbers:", compareNumbers("repo rate to 4.5%", "repo rate unchanged at 6.5%"));
console.log("compareNumbers:", compareNumbers("GDP grew 8.2%", "GDP growth of 8.2%"));

console.log("\n=== INTEGRATION TESTS ===");

const runTest = (name: string, agent: string, source: string, expected: string) => {
  const result = computeTrustScore(agent, [source]);
  console.log(`[${name}] Expected: ${expected} | Actual: ${result.verdict} (Score: ${result.score.toFixed(2)})`);
  if (result.verdict !== expected) {
    console.error(`  -> FAILED: Mismatches:`, JSON.stringify(result.mismatches, null, 2));
  }
};

runTest(
  "Test A: Decimal protection",
  "The repo rate was 6.5% and GDP grew 8.2%.",
  "The repo rate was 6.5% in FY2024. GDP grew 8.2%.",
  "PASS"
);

runTest(
  "Test B: Number mismatch",
  "RBI cut repo rate to 4.5%. GDP grew 8.2%. Inflation was 5.4%.",
  "RBI kept repo rate at 6.5%. GDP grew 8.2%. Inflation averaged 5.4%.",
  "FLAG"
);

runTest(
  "Test C: GPT-5 fabricated",
  "OpenAI released GPT-4 in March 2023. OpenAI announced GPT-5 in December 2024.",
  "OpenAI released GPT-4 on March 14, 2023.",
  "FLAG"
);

runTest(
  "Test E: Full original failing case",
  "The Reserve Bank of India kept the repo rate unchanged at 6.5% to control inflation which averaged 5.4% in FY2024. India recorded GDP growth of 8.2% making it the fastest growing economy in Asia.",
  "India recorded GDP growth of 8.2% in FY2024, maintaining its position as the fastest growing major economy globally. The Reserve Bank of India kept the repo rate unchanged at 6.5%. Retail inflation averaged 5.4% in FY2024.",
  "PASS"
);
