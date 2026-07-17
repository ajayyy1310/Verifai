/**
 * Verifai Verifier — Claim extraction and entity comparison logic
 *
 * Handles:
 * 1. Fine-grained claim extraction (splits on conjunctions, not just sentences)
 * 2. Strict number comparison (500 ≠ 350, no tolerance)
 * 3. Entity overlap calculation with number-aware matching
 * 4. Robust normalization: whitespace, brackets, underscores, unicode, abbreviations
 * 5. Semantic checks: antonyms, unit/currency mismatches, pronoun mismatches, proper noun hallucinations
 */

// ─── Text Normalisation Helpers ────────────────────────────────────────────

/**
 * Normalize raw text before any processing.
 */
function normalizeText(text: string): string {
  let t = text;

  // Collapse newlines / tabs / multiple spaces
  t = t.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');

  // Underscores → space
  t = t.replace(/_/g, ' ');

  // Strip brackets around words: [A] → A
  t = t.replace(/\[([^\]]+)\]/g, '$1');
  t = t.replace(/\{([^}]+)\}/g, '$1');
  t = t.replace(/\(([^)]+)\)/g, '$1');

  // Strip single and double quotes globally
  t = t.replace(/['"]/g, '');

  // Remove lone special chars that don't carry meaning
  t = t.replace(/[™®©]/g, '');

  // Periods inside abbreviations: U.S. → US, A.I. → AI
  t = t.replace(/\b([A-Z])\.([A-Z])\.([A-Z])?\.?/g, (_, a, b, c) => (a + b + (c || '')));

  // Abbreviation expansions
  t = t.replace(/\bU\.K\./gi, 'UK');
  t = t.replace(/\bPh\.D\./gi, 'PhD');
  t = t.replace(/\bDr\b\.?/gi, 'Doctor');
  t = t.replace(/\bMt\b\.?/gi, 'Mount');
  t = t.replace(/\bSt\b\.?/gi, 'Saint');

  // Month abbreviations → full names (for date matching)
  const months: Record<string, string> = {
    Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
    Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September',
    Oct: 'October', Nov: 'November', Dec: 'December'
  };
  t = t.replace(/\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b\.?/g,
    (_, m) => months[m] ?? m);

  // Ordinals: 1st → 1, 2nd → 2 (for date matching)
  t = t.replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1');

  // Number words → digits
  const numberWords: Record<string, string> = {
    zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
    six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
    eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
    sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
    thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70',
    eighty: '80', ninety: '90', hundred: '100'
  };
  const numWordRegex = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/gi;
  t = t.replace(numWordRegex, (match) => numberWords[match.toLowerCase()] ?? match);

  // & → and
  t = t.replace(/\s*&\s*/g, ' and ');

  // + → plus when between letters/spaces
  t = t.replace(/([a-zA-Z\s])\+([a-zA-Z\s])/g, '$1 plus $2');

  // = → is  (A=10 → A is 10)
  t = t.replace(/\s*=\s*/g, ' is ');

  // Slash between letters treated as "or"
  t = t.replace(/([a-zA-Z])\/([a-zA-Z])/g, '$1 or $2');

  // Trim
  t = t.trim();
  return t;
}

/**
 * Normalize a number string: strip currency, commas, percentage, whitespace.
 * Also handles abbreviated magnitudes: $5M → 5000000, etc.
 */
export function normalizeNumber(numStr: string): string {
  let n = numStr.trim();

  // Abbreviated magnitudes first: $5M, 2K, 1.5B, 3T, 4L (lakh), 2Cr
  const magMatch = n.match(/^[₹$€£]?\s*(\d+(?:\.\d+)?)\s*(K|M|B|T|Cr|L|lakh|crore|million|billion|trillion|thousand)?$/i);
  if (magMatch) {
    const base = parseFloat(magMatch[1]);
    const mag = (magMatch[2] || '').toLowerCase();
    const multipliers: Record<string, number> = {
      k: 1e3, thousand: 1e3,
      m: 1e6, million: 1e6,
      b: 1e9, billion: 1e9,
      t: 1e12, trillion: 1e12,
      l: 1e5, lakh: 1e5,
      cr: 1e7, crore: 1e7,
    };
    if (mag && multipliers[mag]) {
      return String(Math.round(base * multipliers[mag]));
    }
  }

  // Strip currency, commas, percentage
  n = n.replace(/[₹$€£,%\s]/g, '');

  // Leading dot decimals: .5 → 0.5
  n = n.replace(/^\.(\d)/, '0.$1');

  // Remove trailing decimal zeroes (10.0 -> 10)
  if (n.includes('.')) {
    n = parseFloat(n).toString();
  }

  return n;
}

/**
 * Extract all numbers from text, normalized.
 */
export function extractNumbers(text: string): string[] {
  // Match currency+number+optional-unit, or plain number+optional-unit
  const numberRegex = /[₹$€£]?\s*(?:\d+(?:,\d{3})*(?:\.\d+)?|\.\d+)\s*(?:%|K|M|B|T|Cr|L|crore|lakh|million|billion|trillion|thousand)?/gi;
  const matches = text.match(numberRegex) || [];
  return matches.map(m => m.trim()).filter(Boolean);
}

// ─── Claim Extraction ────────────────────────────────────────────────────

/**
 * Extract claims from text by splitting on sentence/clause boundaries.
 */
export function extractClaims(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 1. Apply global normalization
  let t = normalizeText(text);

  // 2. Protect decimal numbers from being split (including trailing dot decimals and consecutive decimals)
  t = t.replace(/\.(\d)/g, '_DECIMAL_$1');

  // 3. Protect known abbreviation patterns
  const abbrRegex = /\b(Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|Corp|vs|etc|No|St|Ave|Blvd)\./gi;
  t = t.replace(abbrRegex, (m) => m.replace('.', '_DOT_'));

  // 4. Split on sentence boundaries
  let claims = t.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

  // 5. Restore protected tokens
  claims = claims.map(c =>
    c.replace(/_DECIMAL_/g, '.').replace(/_DOT_/g, '.')
  );

  // 6. Split on semicolons and colons
  claims = claims.flatMap(c => {
    // If it contains a colon, check if the part before the colon is a single word label
    if (c.includes(':')) {
      const idx = c.indexOf(':');
      const left = c.substring(0, idx).trim();
      const right = c.substring(idx + 1).trim();
      if (!left.includes(' ') && left.length < 15) {
        return [right];
      }
    }
    return c.split(/[;:]+/).map(s => s.trim()).filter(s => s.length > 0);
  });

  // 7. Split on coordinating conjunctions
  claims = claims.flatMap(c => splitOnConjunctions(c));

  // 8. Filter ultra-short fragments
  claims = claims.filter(c => c.trim().length >= 1);

  return claims;
}

/**
 * Split on coordinating conjunctions that join independent clauses.
 */
function splitOnConjunctions(claim: string): string[] {
  let parts = [claim];

  // " but ", " however ", " moreover ", " additionally ", " also "
  const conjunctions = [' but ', ' however ', ' moreover ', ' additionally ', ' also '];
  conjunctions.forEach(conj => {
    parts = parts.flatMap(p => {
      const segs = p.split(new RegExp(`\\s*${conj.trim()}\\s*`, 'gi'));
      return segs.map(s => s.trim()).filter(s => s.length > 0);
    });
  });

  // " and " only when followed by a subject-indicator/noun + verb lookahead
  parts = parts.flatMap(p => {
    const segs = p.split(/\s+and\s+(?=(?:[a-zA-Z0-9']+\s+){0,2}(?:is|was|are|were|grew|has|have|had|won|visited|built|hired|cost|reported|delivered|launched|grows|fell|gains|lost|sold|bought|released|published|announced|stated|said|reported|claimed|runs|ran|raised|grew|hired|grows|grew|declined|increased|decreased|gained|dropped|started|ended|began|finished|completed|succeeded|failed)\b)/gi);
    return segs.map(s => s.trim()).filter(s => s.length > 0);
  });

  return parts;
}

// ─── Stemmer & Stopwords ────────────────────────────────────────────────

const stems: Record<string, string> = {
  grew: 'grow',
  grows: 'grow',
  growth: 'grow',
  growing: 'grow',
  revenue: 'revenu',
  revenues: 'revenu',
  users: 'user',
  products: 'product',
  attends: 'attend',
  attended: 'attend',
  attending: 'attend',
  attendance: 'attend',
  launches: 'launch',
  launched: 'launch',
  launching: 'launch',
  funded: 'fund',
  funding: 'fund',
  funds: 'fund',
  raises: 'rais',
  raised: 'rais',
  raising: 'rais',
  delivers: 'deliv',
  delivered: 'deliv',
  delivering: 'deliv',
  visits: 'visit',
  visited: 'visit',
  visiting: 'visit',
  costs: 'cost',
  costed: 'cost',
  costing: 'cost',
  jumped: 'jump',
  jumps: 'jump',
  jumping: 'jump',
  apples: 'apple',
  oranges: 'orange',
  workers: 'worker',
  hired: 'hire',
};

function stem(word: string): string {
  const w = word.toLowerCase();
  if (stems[w]) return stems[w];
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  return w;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'to', 'with', 'and', 'or', 'but',
  'is', 'are', 'was', 'were', 'it', 'this', 'that', 'he', 'she', 'they', 'we', 'of',
  'as', 'from', 'be', 'has', 'have', 'had', 'not', 'no', 'which', 'who', 'whom',
  'whose', 'will', 'would', 'can', 'could', 'should', 'shall', 'may', 'might', 'must',
  'do', 'does', 'did', 'done', 'doing', 'its', 'their', 'our', 'my', 'your', 'his', 'her',
  'been', 'being', 'am', 'into', 'onto', 'upon', 'about', 'above', 'below', 'under',
  'over', 'through', 'after', 'before', 'between', 'among', 'during', 'until', 'since',
  'without', 'within', 'along', 'across', 'behind', 'beyond', 'up', 'down', 'out', 'off',
  'plus', 'minus', 'per', 'than', 'then', 'when', 'where', 'while', 'if', 'so', 'yet',
  'nor', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'some', 'such',
  'own', 'same', 'other', 'another', 'few', 'more', 'most', 'many', 'much', 'very',
  'just', 'only', 'even', 'also', 'back', 'here', 'there', 'too', 'now', 'how', 'new',
  'non', 'pre', 'post',
]);

export function extractEntities(text: string): string[] {
  const normalized = normalizeText(text);
  const dehyphenated = normalized.replace(/-/g, ' ');

  // Match single capitalized letters OR words of length 2+
  const entityRegex = /\b(?:[A-Z]|[a-zA-Z]{2,})\b/g;
  const matches = dehyphenated.match(entityRegex) || [];

  const filtered = matches.filter(m => {
    if (m.length === 1 && m === m.toUpperCase()) {
      return true; // Keep capitalized single letters!
    }
    return !STOPWORDS.has(m.toLowerCase());
  });
  return [...new Set(filtered.map(stem))];
}

// ─── Semantic Validators ───────────────────────────────────────────────

const ANTONYMS: Array<[Set<string>, Set<string>]> = [
  [new Set(['up', 'increase', 'growth', 'grew', 'grow', 'grows', 'rise', 'rose', 'more', 'above', 'over']), new Set(['down', 'decrease', 'decline', 'drop', 'fall', 'fell', 'less', 'below', 'under', 'loss', 'lost', 'lose'])],
  [new Set(['hire', 'hired', 'hiring']), new Set(['fire', 'fired', 'quit', 'laid off', 'layoff'])],
  [new Set(['buy', 'bought', 'purchased']), new Set(['sell', 'sold'])]
];

function hasSemanticContradiction(claim: string, source: string): boolean {
  const claimWords = claim.toLowerCase().split(/\W+/);
  const sourceWords = source.toLowerCase().split(/\W+/);

  for (const [set1, set2] of ANTONYMS) {
    const claimHasSet1 = claimWords.some(w => set1.has(w));
    const claimHasSet2 = claimWords.some(w => set2.has(w));
    const sourceHasSet1 = sourceWords.some(w => set1.has(w));
    const sourceHasSet2 = sourceWords.some(w => set2.has(w));

    if ((claimHasSet1 && sourceHasSet2 && !sourceHasSet1) ||
        (claimHasSet2 && sourceHasSet1 && !sourceHasSet2)) {
      return true;
    }
  }
  return false;
}

const unitGroups = [
  [ ['$', 'dollar', 'dollars', 'usd'], ['₹', 'rupee', 'rupees', 'inr', 'rs'], ['€', 'euro', 'euros', 'eur'], ['£', 'pound', 'pounds', 'gbp'] ],
  [ ['km', 'kilometer', 'kilometers'], ['mile', 'miles', 'mi'] ],
  [ ['kg', 'kilogram', 'kilograms'], ['lb', 'lbs', 'pound', 'pounds'] ]
];

function detectCurrencyOrUnitMismatch(claim: string, source: string): boolean {
  const claimLower = claim.toLowerCase();
  const sourceLower = source.toLowerCase();

  for (const group of unitGroups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const u1 = group[i];
        const u2 = group[j];

        const claimHas1 = u1.some(k => k.startsWith('$') || k.startsWith('₹') || k.startsWith('€') || k.startsWith('£') ? claimLower.includes(k) : new RegExp(`\\b${k}\\b`).test(claimLower));
        const sourceHas2 = u2.some(k => k.startsWith('$') || k.startsWith('₹') || k.startsWith('€') || k.startsWith('£') ? sourceLower.includes(k) : new RegExp(`\\b${k}\\b`).test(sourceLower));

        const claimHas2 = u2.some(k => k.startsWith('$') || k.startsWith('₹') || k.startsWith('€') || k.startsWith('£') ? claimLower.includes(k) : new RegExp(`\\b${k}\\b`).test(claimLower));
        const sourceHas1 = u1.some(k => k.startsWith('$') || k.startsWith('₹') || k.startsWith('€') || k.startsWith('£') ? sourceLower.includes(k) : new RegExp(`\\b${k}\\b`).test(sourceLower));

        if ((claimHas1 && sourceHas2 && !sourceHas1) || (claimHas2 && sourceHas1 && !sourceHas2)) {
          return true;
        }
      }
    }
  }
  return false;
}

function hasPronounMismatch(claim: string, source: string): boolean {
  const claimLower = claim.toLowerCase().split(/\W+/);
  const sourceLower = source.toLowerCase().split(/\W+/);

  const claimHasHe = claimLower.some(w => w === 'he' || w === 'him' || w === 'his' || w === 'himself');
  const claimHasShe = claimLower.some(w => w === 'she' || w === 'her' || w === 'hers' || w === 'herself');

  const sourceHasHe = sourceLower.some(w => w === 'he' || w === 'him' || w === 'his' || w === 'himself');
  const sourceHasShe = sourceLower.some(w => w === 'she' || w === 'her' || w === 'hers' || w === 'herself');

  if ((claimHasHe && sourceHasShe && !sourceHasHe) || (claimHasShe && sourceHasHe && !sourceHasShe)) {
    return true;
  }
  return false;
}

function hasProperNounHallucination(claim: string, source: string): boolean {
  const words = claim.trim().split(/\s+/);
  if (words.length === 0) return false;
  
  // Only lowercase the first word if it is not fully capitalized (keeps acronyms like NASA, US, AI capitalized)
  if (words[0] !== words[0].toUpperCase()) {
    words[0] = words[0].toLowerCase();
  }
  const adjustedClaim = words.join(' ');

  const capitalizedWords = adjustedClaim.match(/\b[A-Z][a-zA-Z]*\b/g) || [];
  const sourceLower = source.toLowerCase();

  for (const word of capitalizedWords) {
    if (!sourceLower.includes(word.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function hasAbbreviationMismatch(claim: string, source: string): boolean {
  const claimAbbrs = claim.match(/\b(?:[A-Z]\.)+[A-Z]?\b/g) || [];
  const sourceLower = source.toLowerCase();

  for (const abbr of claimAbbrs) {
    const cleanAbbr = abbr.replace(/\./g, '').toLowerCase();
    if (sourceLower.includes(cleanAbbr) && !sourceLower.includes(abbr.toLowerCase())) {
      return true;
    }
  }

  const sourceAbbrs = source.match(/\b(?:[A-Z]\.)+[A-Z]?\b/g) || [];
  const claimLower = claim.toLowerCase();
  for (const abbr of sourceAbbrs) {
    const cleanAbbr = abbr.replace(/\./g, '').toLowerCase();
    if (claimLower.includes(cleanAbbr) && !claimLower.includes(abbr.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function hasCommaMismatch(claim: string, source: string): boolean {
  const claimCommas = claim.match(/\b\d{1,3}(?:,\d{3})+\b/g) || [];
  const sourceLower = source.toLowerCase();

  for (const num of claimCommas) {
    const cleanNum = num.replace(/,/g, '');
    if (cleanNum.length > 4 && sourceLower.includes(cleanNum) && !sourceLower.includes(num)) {
      return true;
    }
  }

  const sourceCommas = source.match(/\b\d{1,3}(?:,\d{3})+\b/g) || [];
  const claimLower = claim.toLowerCase();
  for (const num of sourceCommas) {
    const cleanNum = num.replace(/,/g, '');
    if (cleanNum.length > 4 && claimLower.includes(cleanNum) && !claimLower.includes(num)) {
      return true;
    }
  }
  return false;
}

function hasDecimalPrecisionMismatch(claim: string, source: string): boolean {
  const claimDecimals = claim.match(/\b\d+\.\d+\b/g) || [];
  const sourceLower = source.toLowerCase();

  for (const num of claimDecimals) {
    const integerPart = num.split('.')[0];
    if (sourceLower.includes(integerPart) && !sourceLower.includes(num)) {
      return true;
    }
  }

  const sourceDecimals = source.match(/\b\d+\.\d+\b/g) || [];
  const claimLower = claim.toLowerCase();
  for (const num of sourceDecimals) {
    const integerPart = num.split('.')[0];
    if (claimLower.includes(integerPart) && !claimLower.includes(num)) {
      return true;
    }
  }
  return false;
}

function checkForDowngrades(claim: string, combinedSource: string): boolean {
  if (hasAbbreviationMismatch(claim, combinedSource)) return true;
  if (hasCommaMismatch(claim, combinedSource)) return true;
  if (hasDecimalPrecisionMismatch(claim, combinedSource)) return true;
  return false;
}

// ─── Number Comparison ────────────────────────────────────────────────────

export type NumberComparison = {
  matched: string[];
  claimOnly: string[];
  sourceOnly: string[];
};

export type ClaimResult = {
  score: number;
  supported: boolean;
  entityRatio: number;
  numberMatch: boolean;
};

export function getContextValidatedNumbers(
  claimEntities: string[],
  sources: string[]
): {
  contextValidatedSourceNumbers: Set<string>;
  allSourceNumbers: Set<string>;
} {
  const contextValidatedSourceNumbers = new Set<string>();
  const allSourceNumbers = new Set<string>();

  sources.forEach(source => {
    const sourceFragments = extractClaims(source);
    sourceFragments.forEach(fragment => {
      const fragmentEntities = extractEntities(fragment);
      const fragmentNumbers = extractNumbers(fragment);
      fragmentNumbers.forEach(n => allSourceNumbers.add(n));

      const hasOverlap = claimEntities.some(ce =>
        fragmentEntities.some(fe => fe.toLowerCase() === ce.toLowerCase())
      );
      if (hasOverlap || claimEntities.length === 0) {
        fragmentNumbers.forEach(n => contextValidatedSourceNumbers.add(normalizeNumber(n)));
      }
    });
  });

  return { contextValidatedSourceNumbers, allSourceNumbers };
}

export function compareNumbers(claim: string, source: string): NumberComparison {
  const claimNumbers = extractNumbers(claim);
  const claimEntities = extractEntities(claim);

  const { contextValidatedSourceNumbers, allSourceNumbers } = getContextValidatedNumbers(claimEntities, [source]);

  const matched: string[] = [];
  const claimOnly: string[] = [];

  const claimNumbersNorm = claimNumbers.map(n => normalizeNumber(n));

  claimNumbers.forEach(num => {
    if (contextValidatedSourceNumbers.has(normalizeNumber(num))) {
      matched.push(num);
    } else {
      claimOnly.push(num);
    }
  });

  const sourceOnly = Array.from(allSourceNumbers).filter(
    num => !claimNumbersNorm.includes(normalizeNumber(num))
  );

  return { matched, claimOnly, sourceOnly };
}

// ─── Claim Verification ───────────────────────────────────────────────────

export function verifyClaimAgainstSource(
  claim: string,
  sources: string[],
  isSingleClaim = false
): {
  supported: boolean;
  entityRatio: number;
  numberMatch: boolean;
  hasNumberHallucination: boolean;
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
  const allSourceEntities = new Set<string>();

  sources.forEach(source => {
    extractEntities(source).forEach(e => allSourceEntities.add(e));
  });

  const { contextValidatedSourceNumbers, allSourceNumbers } = getContextValidatedNumbers(claimEntities, sources);

  const sourceEntitiesArr = Array.from(allSourceEntities);
  claimEntities.forEach(entity => {
    if (sourceEntitiesArr.some(se => se.toLowerCase() === entity.toLowerCase())) {
      totalEntityMatches++;
    }
  });

  const claimNumbersNorm = claimNumbers.map(n => normalizeNumber(n));
  const matchedNumbers = claimNumbers.filter(num => contextValidatedSourceNumbers.has(normalizeNumber(num)));
  const claimOnlyNumbers = claimNumbers.filter(num => !contextValidatedSourceNumbers.has(normalizeNumber(num)));

  const numberComparison: NumberComparison = {
    matched: matchedNumbers,
    claimOnly: claimOnlyNumbers,
    sourceOnly: Array.from(allSourceNumbers).filter(num => !claimNumbersNorm.includes(normalizeNumber(num))),
  };

  let numberMatch = true;
  if (claimNumbers.length > 0 && claimOnlyNumbers.length > 0) {
    numberMatch = false;
  }

  const entityRatio = claimEntities.length > 0
    ? totalEntityMatches / claimEntities.length
    : 0.0;

  const meaningfulTokens = claimEntities.length + claimNumbers.length;
  const ENTITY_THRESHOLD = 0.5;
  let supported = entityRatio >= ENTITY_THRESHOLD && numberMatch && meaningfulTokens >= 2;

  // Special case: 1-token claims are only supported if they are an exact match to one of the source texts, or if it's part of a multi-claim output
  if (meaningfulTokens === 1 && numberMatch) {
    if (!isSingleClaim) {
      supported = true;
    } else {
      const normClaim = normalizeText(claim).toLowerCase();
      if (sources.some(s => normalizeText(s).toLowerCase() === normClaim)) {
        supported = true;
      }
    }
  }

  const combinedSource = sources.join(' ');

  if (supported) {
    if (hasSemanticContradiction(claim, combinedSource)) {
      supported = false;
    } else if (detectCurrencyOrUnitMismatch(claim, combinedSource)) {
      supported = false;
    } else if (hasPronounMismatch(claim, combinedSource)) {
      supported = false;
    } else if (hasProperNounHallucination(claim, combinedSource)) {
      supported = false;
    }
  }

  let hasNumberHallucination = false;
  if (claimNumbers.length > 0 && claimOnlyNumbers.length > 0) {
    hasNumberHallucination = claimOnlyNumbers.some(num => {
      const norm = normalizeNumber(num);
      return !sources.some(source => {
        const srcNums = extractNumbers(source).map(normalizeNumber);
        return srcNums.some(sn => sn.includes(norm) || norm.includes(sn));
      });
    });
  }

  return {
    supported,
    entityRatio,
    numberMatch,
    hasNumberHallucination,
    details: {
      claimEntities,
      sourceEntities: sourceEntitiesArr,
      matchedEntities: claimEntities.filter(e =>
        sourceEntitiesArr.some(se => se.toLowerCase() === e.toLowerCase())
      ),
      numberComparison,
    },
  };
}

// ─── Trust Score Computation ─────────────────────────────────────────────

export function computeTrustScore(agentOutput: string, sources: string[]): {
  score: number;
  verdict: 'PASS' | 'BLOCK' | 'FLAG';
  mismatches: Array<{ claim: string; sourceText: string; issue: string }>;
  claimDetails: Array<{
    claim: string;
    supported: boolean;
    entityRatio: number;
    numberMatch: boolean;
    hasNumbers: boolean;
    meaningfulTokens: number;
  }>;
} {
  const claims = extractClaims(agentOutput);
  const mismatches: Array<{ claim: string; sourceText: string; issue: string }> = [];
  const claimDetails: Array<{
    claim: string;
    supported: boolean;
    entityRatio: number;
    numberMatch: boolean;
    hasNumbers: boolean;
    meaningfulTokens: number;
  }> = [];

  let supportedCount = 0;
  const verifications: any[] = [];
  const isSingleClaim = claims.length === 1;

  claims.forEach(claim => {
    const verification = verifyClaimAgainstSource(claim, sources, isSingleClaim);
    verifications.push(verification);
    claimDetails.push({
      claim,
      supported: verification.supported,
      entityRatio: verification.entityRatio,
      numberMatch: verification.numberMatch,
      hasNumbers: extractNumbers(claim).length > 0,
      meaningfulTokens: verification.details.claimEntities.length + extractNumbers(claim).length,
    });

    if (verification.supported) {
      supportedCount++;
    } else {
      const sourceText = sources.join(' | ');
      let issue = 'Claim not supported by sources';

      if (!verification.numberMatch && verification.details.numberComparison.claimOnly.length > 0) {
        issue = `Numbers in claim (${verification.details.numberComparison.claimOnly.join(', ')}) not found in sources`;
      } else if (verification.entityRatio < 0.5) {
        issue = `Low entity overlap (${(verification.entityRatio * 100).toFixed(0)}%)`;
      }

      mismatches.push({ claim, sourceText, issue });
    }
  });

  if (claims.length === 0) {
    return { score: 0, verdict: 'BLOCK', mismatches: [], claimDetails: [] };
  }

  const score = supportedCount / claims.length;
  const unsupportedCount = claims.length - supportedCount;

  const combinedSource = sources.join(' ');
  let verdict: 'PASS' | 'BLOCK' | 'FLAG';

  if (score >= 0.8 && unsupportedCount === 0) {
    const hasDowngrade = checkForDowngrades(agentOutput, combinedSource);
    verdict = hasDowngrade ? 'FLAG' : 'PASS';
  } else if (score < 0.4) {
    const hasGenderMismatch = claims.some(c => hasPronounMismatch(c, combinedSource));
    const hasSevereProperNounMismatch = claimDetails.some(c => c.entityRatio < 0.6 && hasProperNounHallucination(c.claim, combinedSource));
    const hasNumberHallucinationMismatch = verifications.some(v => v.hasNumberHallucination);

    const hasPartialMatches = claimDetails.some(c => {
      if (c.supported) return false;
      if (c.hasNumbers && c.numberMatch) return true;
      if (c.meaningfulTokens >= 2 && c.entityRatio >= 0.5) return true;
      return false;
    });
    verdict = (hasPartialMatches && !hasGenderMismatch && !hasSevereProperNounMismatch && !hasNumberHallucinationMismatch) ? 'FLAG' : 'BLOCK';
  } else {
    verdict = 'FLAG';
  }

  return { score, verdict, mismatches, claimDetails };
}
