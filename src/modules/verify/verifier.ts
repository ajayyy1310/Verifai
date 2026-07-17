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
export function extractClaims(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Step 1: Split on sentence boundaries
  let claims = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

  // Step 2: Further split on semicolons and colons
  claims = claims.flatMap(claim => claim.split(/[;:]+/).map(s => s.trim()).filter(s => s.length > 0));

  // Step 3: Split on coordinating conjunctions when they join independent clauses
  claims = claims.flatMap(claim => splitOnConjunctions(claim));

  // Step 4: Filter out fragments < 15 characters
  claims = claims.filter(claim => claim.length >= 15);

  return claims;
}

/**
 * Split a claim on coordinating conjunctions when they precede independent clauses.
 * 
 * Patterns:
 * - " and " followed by subject indicators (has, the, they, it, is, was, etc.)
 * - " but ", " however ", " moreover ", " additionally ", " also "
 */
function splitOnConjunctions(claim: string): string[] {
  let result = [claim];

  // Pattern 1: " and " followed by subject indicators
  const andPattern = /\s+and\s+(?=has|have|the|they|it|is|was|are|were|being|been|do|does|did|can|could|will|would|should|may|might|must|shall|get|gets|got|make|makes|made|take|takes|took|give|gives|gave|go|goes|went|come|comes|came|see|sees|saw|know|knows|knew|think|thinks|thought|say|says|said|tell|tells|told|ask|asks|asked|work|works|worked|use|uses|used|find|finds|found|provide|provides|provided|include|includes|included|show|shows|showed|own|owns|owned|run|runs|ran|lead|leads|led|manage|manages|managed|develop|develops|developed|create|creates|created|build|builds|built|produce|produces|produced|generate|generates|generated|operate|operates|operated|maintain|maintains|maintained|support|supports|supported|serve|serves|served|offer|offers|offered|deliver|delivers|delivered|achieve|achieves|achieved|reach|reaches|reached|expand|expands|expanded|grow|grows|grew|increase|increases|increased|decrease|decreases|decreased|improve|improves|improved|reduce|reduces|reduced|enhance|enhances|enhanced|strengthen|strengthens|strengthened|weaken|weakens|weakened|establish|establishes|established|maintain|maintains|maintained|continue|continues|continued|begin|begins|began|start|starts|started|end|ends|ended|finish|finishes|finished|complete|completes|completed|succeed|succeeds|succeeded|fail|fails|failed|win|wins|won|lose|loses|lost|gain|gains|gained|lose|loses|lost|earn|earns|earned|spend|spends|spent|cost|costs|costed|pay|pays|paid|charge|charges|charged|sell|sells|sold|buy|buys|bought|trade|trades|traded|exchange|exchanges|exchanged|invest|invests|invested|fund|funds|funded|raise|raises|raised|launch|launches|launched|release|releases|released|publish|publishes|published|announce|announces|announced|declare|declares|declared|claim|claims|claimed|report|reports|reported|state|states|stated|mention|mentions|mentioned|note|notes|noted|observe|observes|observed|record|records|recorded|document|documents|documented|list|lists|listed|name|names|named|identify|identifies|identified|recognize|recognizes|recognized|acknowledge|acknowledges|acknowledged|admit|admits|admitted|deny|denies|denied|confirm|confirms|confirmed|verify|verifies|verified|validate|validates|validated|approve|approves|approved|reject|rejects|rejected|accept|accepts|accepted|refuse|refuses|refused|allow|allows|allowed|permit|permits|permitted|enable|enables|enabled|disable|disables|disabled|authorize|authorizes|authorized|prohibit|prohibits|prohibited|require|requires|required|demand|demands|demanded|request|requests|requested|suggest|suggests|suggested|recommend|recommends|recommended|advise|advises|advised|warn|warns|warned|inform|informs|informed|notify|notifies|notified|alert|alerts|alerted|remind|reminds|reminded|encourage|encourages|encouraged|discourage|discourages|discouraged|persuade|persuades|persuaded|convince|convinces|convinced|force|forces|forced|compel|compels|compelled|urge|urges|urged|push|pushes|pushed|pull|pulls|pulled|drive|drives|drove|motivate|motivates|motivated|inspire|inspires|inspired|influence|influences|influenced|affect|affects|affected|impact|impacts|impacted|change|changes|changed|transform|transforms|transformed|convert|converts|converted|translate|translates|translated|interpret|interprets|interpreted|understand|understands|understood|comprehend|comprehends|comprehended|grasp|grasps|grasped|realize|realizes|realized|perceive|perceives|perceived|sense|senses|sensed|feel|feels|felt|experience|experiences|experienced|suffer|suffers|suffered|enjoy|enjoys|enjoyed|like|likes|liked|love|loves|loved|hate|hates|hated|prefer|prefers|preferred|choose|chooses|chose|select|selects|selected|pick|picks|picked|decide|decides|decided|determine|determines|determined|resolve|resolves|resolved|settle|settles|settled|conclude|concludes|concluded|judge|judges|judged|evaluate|evaluates|evaluated|assess|assesses|assessed|measure|measures|measured|calculate|calculates|calculated|compute|computes|computed|estimate|estimates|estimated|predict|predicts|predicted|forecast|forecasts|forecasted|anticipate|anticipates|anticipated|expect|expects|expected|hope|hopes|hoped|wish|wishes|wished|desire|desires|desired|want|wants|wanted|need|needs|needed|require|requires|required|demand|demands|demanded|crave|craves|craved|yearn|yearns|yearned|long|longs|longed|hunger|hungers|hungered|thirst|thirsts|thirsted)\b/gi;

  result = result.flatMap(claim => {
    const parts = claim.split(andPattern);
    return parts.map(p => p.trim()).filter(p => p.length > 0);
  });

  // Pattern 2: " but ", " however ", " moreover ", " additionally ", " also "
  const conjunctions = [' but ', ' however ', ' moreover ', ' additionally ', ' also '];
  conjunctions.forEach(conj => {
    result = result.flatMap(claim => {
      const parts = claim.split(new RegExp(`\\s*${conj.trim()}\\s*`, 'gi'));
      return parts.map(p => p.trim()).filter(p => p.length > 0);
    });
  });

  return result;
}

/**
 * Extract all numbers from text, normalized (no commas).
 * Returns array of integers.
 */
export function extractNumbers(text: string): number[] {
  const numberRegex = /\d+(?:,\d{3})*/g;
  const matches = text.match(numberRegex) || [];
  return matches.map(m => parseInt(m.replace(/,/g, ''), 10));
}

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

export function compareNumbers(claim: string, source: string): NumberComparison {
  const claimNumbers = extractNumbers(claim);
  const sourceNumbers = extractNumbers(source);

  const matched: number[] = [];
  const claimOnly: number[] = [];
  const sourceOnly: Set<number> = new Set(sourceNumbers);

  claimNumbers.forEach(num => {
    if (sourceNumbers.includes(num)) {
      matched.push(num);
      sourceOnly.delete(num);
    } else {
      claimOnly.push(num);
    }
  });

  const result: NumberComparison = {
    matched,
    claimOnly,
    sourceOnly: Array.from(sourceOnly),
  };
  return result;
}

/**
 * Extract named entities (company names, locations, people) from text.
 * Simple heuristic: capitalized words and multi-word phrases.
 */
export function extractEntities(text: string): string[] {
  // Match capitalized words and multi-word capitalized phrases
  const entityRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = text.match(entityRegex) || [];
  return [...new Set(matches)]; // Deduplicate
}

/**
 * Verify a single claim against sources.
 * Returns: { supported: boolean, entityRatio: number, numberMatch: boolean }
 */
export function verifyClaimAgainstSource(claim: string, sources: string[]): {
  supported: boolean;
  entityRatio: number;
  numberMatch: boolean;
  details: {
    claimEntities: string[];
    sourceEntities: string[];
    matchedEntities: string[];
    numberComparison: ReturnType<typeof compareNumbers>;
  };
} {
  const claimEntities = extractEntities(claim);
  const claimNumbers = extractNumbers(claim);

  let totalEntityMatches = 0;
  let totalSourceEntities = 0;
  let numberMatch = true;
  const allSourceEntities = new Set<string>();
  let numberComparison: NumberComparison = { matched: [], claimOnly: [], sourceOnly: [] };

  sources.forEach(source => {
    const sourceEntities = extractEntities(source);
    sourceEntities.forEach(e => allSourceEntities.add(e));
    totalSourceEntities += sourceEntities.length;

    // Count entity matches
    claimEntities.forEach(entity => {
      if (sourceEntities.some(se => se.toLowerCase() === entity.toLowerCase())) {
        totalEntityMatches++;
      }
    });

    // Check number matches
    const numComparison = compareNumbers(claim, source);
    numberComparison = numComparison;

    // If claim has numbers but none match, flag as potential hallucination
    if (claimNumbers.length > 0 && numComparison.matched.length === 0) {
      numberMatch = false;
    }
  });

  // Entity ratio: matched entities / claim entities
  const entityRatio = claimEntities.length > 0 ? totalEntityMatches / claimEntities.length : 0.5;

  // Supported if: entity ratio > 0.5 AND (no numbers in claim OR numbers match)
  const supported = entityRatio > 0.5 && numberMatch;

  return {
    supported,
    entityRatio,
    numberMatch,
    details: {
      claimEntities,
      sourceEntities: Array.from(allSourceEntities),
      matchedEntities: claimEntities.filter(e =>
        Array.from(allSourceEntities).some(se => se.toLowerCase() === e.toLowerCase())
      ),
      numberComparison,
    },
  };
}

/**
 * Compute trust score for agent output against sources.
 * Uses fine-grained claim extraction and strict number comparison.
 */
export function computeTrustScore(agentOutput: string, sources: string[]): {
  score: number;
  verdict: 'PASS' | 'BLOCK';
  mismatches: Array<{ claim: string; sourceText: string; issue: string }>;
  claimDetails: Array<{
    claim: string;
    supported: boolean;
    entityRatio: number;
    numberMatch: boolean;
  }>;
} {
  const claims = extractClaims(agentOutput);
  const mismatches: Array<{ claim: string; sourceText: string; issue: string }> = [];
  const claimDetails: Array<{
    claim: string;
    supported: boolean;
    entityRatio: number;
    numberMatch: boolean;
  }> = [];

  let supportedCount = 0;

  claims.forEach(claim => {
    const verification = verifyClaimAgainstSource(claim, sources);
    claimDetails.push({
      claim,
      supported: verification.supported,
      entityRatio: verification.entityRatio,
      numberMatch: verification.numberMatch,
    });

    if (verification.supported) {
      supportedCount++;
    } else {
      // Record mismatch
      const sourceText = sources.join(' | ');
      let issue = 'Claim not supported by sources';

      if (!verification.numberMatch && verification.details.numberComparison.claimOnly.length > 0) {
        issue = `Numbers in claim (${verification.details.numberComparison.claimOnly.join(', ')}) not found in sources`;
      } else if (verification.entityRatio < 0.5) {
        issue = `Low entity overlap (${(verification.entityRatio * 100).toFixed(0)}%)`;
      }

      mismatches.push({
        claim,
        sourceText,
        issue,
      });
    }
  });

  // Calculate score: percentage of supported claims
  const score = claims.length > 0 ? supportedCount / claims.length : 0.0;
  const verdict = score >= 0.7 ? 'PASS' : 'BLOCK';

  return {
    score,
    verdict,
    mismatches,
    claimDetails,
  };
}
