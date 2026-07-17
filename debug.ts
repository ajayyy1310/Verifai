import { computeTrustScore, verifyClaimAgainstSource, extractClaims, extractEntities, extractNumbers } from './src/modules/verify/verifier.js';

const claim = "The repo rate was 6.5% and GDP grew 8.2%";
const source = "The repo rate was 6.5% in FY2024. GDP grew 8.2%.";

console.log("extractClaims(source):", extractClaims(source));

const result = verifyClaimAgainstSource(claim, [source]);
console.log("Number match:", result.numberMatch);
console.log("Matched numbers:", result.details.numberComparison.matched);
console.log("Claim only numbers:", result.details.numberComparison.claimOnly);
console.log("Source only numbers:", result.details.numberComparison.sourceOnly);

