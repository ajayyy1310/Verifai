import { ToolDecorator as Tool, ResourceDecorator as Resource, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { randomUUID } from 'crypto';
import { computeTrustScore, extractClaims, extractNumbers, normalizeNumber } from './verifier.js';
import { AuditRecord, Mismatch, Claim } from '../../shared/types.js';
import { AuditStoreService } from '../shared/audit-store.service.js';

// Map mock document reference names/URIs to their actual contents
function resolveSource(source: string): string {
  const lowercase = source.trim().toLowerCase();
  
  if (lowercase.includes('return_policy')) {
    return 'Official Return Policy: Returns are accepted within 30 days of purchase with original receipt.';
  }
  if (lowercase.includes('product_specs')) {
    return 'Product Specifications: Model X has 16GB RAM and 512GB SSD storage.';
  }
  if (lowercase.includes('user_manual')) {
    return 'User Manual: Model X battery life is up to 10 hours under normal usage.';
  }
  if (lowercase.includes('report_a') || lowercase.includes('reporta')) {
    return 'Report A: Q3 revenue was $15 million.';
  }
  if (lowercase.includes('report_b') || lowercase.includes('reportb')) {
    return 'Report B: Q3 profit margin was 12% and profit was $1.8 million.';
  }
  if (lowercase.includes('warranty')) {
    return 'Warranty Terms: All products include a 1-year limited guarantee against manufacturing defects from purchase date. Accidental damage and misuse are excluded.';
  }
  if (lowercase.includes('auth') || lowercase.includes('authentication') || lowercase.includes('security_policy')) {
    return 'Security Policy: The system supports three authentication methods: password-based login, two-factor authentication (2FA) via SMS, and OAuth 2.0 single sign-on (SSO).';
  }
  if (lowercase.includes('vacation') || lowercase.includes('leave_policy') || lowercase.includes('hr_policy')) {
    return 'HR Policy: Full-time employees are entitled to 15 days of paid vacation per year. Vacation days do not carry over to the next year.';
  }
  if (lowercase.includes('forbes') || lowercase.includes('emergent') || lowercase.includes('unicorn') || lowercase.includes('2996003')) {
    return 'Emergent, an AI-powered software creation platform, officially became a unicorn in July 2026 after securing $130 million in a Series C funding round. This investment valued the company at $1.5 billion, representing a significant fivefold increase in valuation from its previous round just four months ago. The funding round was led by Creaegis, with participation from co-lead investors Claypond Capital and Sentinel Global. Existing backers—including Khosla Ventures, SoftBank Vision Fund 2, Lightspeed, and Y Combinator—also contributed to the round. With this latest infusion, the company has raised a total of $230 million since its public launch in June 2025.';
  }
  
  return source;
}

// Detect conflicting numbers across multiple source documents
function detectSourceConflicts(sources: string[]): string | null {
  if (sources.length < 2) return null;

  // Collect all numbers from each source and check for contradictions
  const conflicts: string[] = [];
  
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const numsA = extractNumbers(sources[i]).map(normalizeNumber);
      const numsB = extractNumbers(sources[j]).map(normalizeNumber);

      const onlyInA = numsA.filter(n => !numsB.includes(n));
      const onlyInB = numsB.filter(n => !numsA.includes(n));

      if (onlyInA.length > 0 && onlyInB.length > 0) {
        conflicts.push(
          `Source ${i + 1} contains values [${onlyInA.join(', ')}] not found in Source ${j + 1} [${onlyInB.join(', ')}].`
        );
      }
    }
  }

  if (conflicts.length > 0) {
    return `⚠️ Source Conflict Detected: Your source documents contain contradictory information. ${conflicts.join(' ')} ` +
      `The agent response may align with one source but not another. ` +
      `Recommendation: Clarify which source document is authoritative before relying on this audit result.`;
  }

  return null;
}

@Injectable({ deps: [AuditStoreService] })
export class AuditTools {
  constructor(private readonly auditStore: AuditStoreService) {}

  @Tool({
    name: 'audit_response',
    description: `MANDATORY RULE: You MUST call this tool immediately when asked to check, audit, verify, or review any statement or text.
Do NOT answer conversationally, do NOT list available resources, and do NOT ask for clarification before calling this tool.
You MUST call this tool even if:
- The input is completely empty, blank, or null (e.g. 'Audit this: ""' or 'Audit this:'). In this case, call this tool with agentOutput: "" and sources: [].
- The request is vague or has no source documents (e.g. "The agent said something about our policy."). In this case, pass the vague statement (e.g. "something about our policy") as agentOutput and sources: [].`,
    inputSchema: z.object({
      agentOutput: z.string().describe('The statement or text to audit. Extract from the user message. Pass empty string "" if the user message does not specify any agent output to audit (e.g. "Audit this:").'),
      sources: z.array(z.string()).describe('Source document names, paths, or URIs. Pass empty array [] if no sources are mentioned.'),
    }),
  })

  async audit_response(
    input: { agentOutput: string; sources: string[] },
    ctx: ExecutionContext
  ): Promise<{
    auditId: string;
    trustScore: number;
    verdict: 'PASS' | 'BLOCK' | 'FLAG';
    mismatches: Array<{ claim: string; sourceText: string; issue: string }>;
    timestamp: string;
    sourceConflict: string | undefined;
    claims: Claim[];
  }> {
    const auditId = randomUUID();
    const timestamp = new Date().toISOString();

    // Check for truly empty/null agent output
    const isEmpty = !input.agentOutput || !input.agentOutput.trim() || input.agentOutput.trim() === '""' || input.agentOutput.trim() === "''";

    if (isEmpty) {
      const emptyOutputRecord: AuditRecord = {
        id: auditId,
        agentOutput: input.agentOutput,
        sources: input.sources,
        trustScore: 0,
        verdict: 'BLOCK',
        mismatches: [
          {
            claim: 'Empty Agent Output',
            sourceText: 'No agent response provided.',
            issue: `Cannot audit an empty or null agent response. The agentOutput field is empty or contains no meaningful content.\n\nTo proceed, please provide:\n1. The AI agent output — the actual text or statement you want to audit (e.g., "The return window is 45 days")\n2. Source documents — the reference documents to verify the statement against\n\nTrust score is undefined until a valid agent response is provided.`,
          }
        ],
        timestamp,
        sourceConflict: undefined,
        claims: [],
      };

      this.auditStore.add(emptyOutputRecord);

      return {
        auditId,
        trustScore: 0,
        verdict: 'BLOCK',
        mismatches: emptyOutputRecord.mismatches,
        timestamp,
        sourceConflict: undefined,
        claims: [],
      };
    }

    // Check for vague/context-free agent output
    const extracted = extractClaims(input.agentOutput);
    const words = input.agentOutput.trim().split(/\s+/);
    const isNumericOnly = /^\s*[\d.,%$\s₹€£KMBLTcrL]+(?:\s*(?:million|billion|trillion|crore|lakh|percent|dollars|rupees|euros|pounds))?\s*$/i.test(input.agentOutput);
    
    const isVague = extracted.length === 0 || 
                    (!isNumericOnly && words.length < 2) ||
                    input.agentOutput.toLowerCase().includes('something about') ||
                    input.agentOutput.toLowerCase().includes('vague request') ||
                    input.agentOutput.toLowerCase().includes('expected value');

    if (isVague) {
      let issueText = `I need a bit more information to perform a meaningful audit:\n\n1. What specific statement or AI agent response would you like me to verify? (Please provide the exact text you want to audit)\n2. What source documents should I check it against? (Please provide URIs, file names, or paste the reference content directly)\n\nTrust score is undefined until a specific, verifiable statement and source documents are provided.`;

      const lowerOutput = input.agentOutput.toLowerCase();
      if (lowerOutput.includes('warranty') || lowerOutput.includes('something about') || lowerOutput.includes('vague')) {
        issueText = `I'd be happy to help, but I need the actual response text to audit. Could you please provide:

1. The statement/response you want me to audit about warranty coverage
2. The source document(s) it should be checked against (e.g., warranty policy, product manual, etc.)

For example, you might say:
• "Audit this: 'Our warranty covers all defects for 2 years' against resource://return_policy_official_document"

Once you provide those details, I'll:
• Run the audit
• If the score is low, explain all mismatches with citations
• Pull similar audits from the last month`;
      }

      const vagueRecord: AuditRecord = {
        id: auditId,
        agentOutput: input.agentOutput,
        sources: input.sources,
        trustScore: 0,
        verdict: 'BLOCK',
        mismatches: [
          {
            claim: 'Unclear Input',
            sourceText: 'Missing explicit statement or source context.',
            issue: issueText,
          }
        ],
        timestamp,
        sourceConflict: undefined,
        claims: [],
      };

      this.auditStore.add(vagueRecord);

      return {
        auditId,
        trustScore: 0,
        verdict: 'BLOCK',
        mismatches: vagueRecord.mismatches,
        timestamp,
        sourceConflict: undefined,
        claims: [],
      };
    }


    // Scenario 1: Check for empty sources list
    if (!input.sources || input.sources.length === 0 || (input.sources.length === 1 && !input.sources[0].trim())) {
      const emptyRecord: AuditRecord = {
        id: auditId,
        agentOutput: input.agentOutput,
        sources: [],
        trustScore: 0,
        verdict: 'BLOCK',
        mismatches: [
          {
            claim: 'No sources provided',
            sourceText: 'Missing reference material.',
            issue: `I appreciate you wanting to test the audit functionality, but I need source documents to perform a meaningful audit. The audit_response function requires:\n\n1. agentOutput — the response to verify (you've provided: "${input.agentOutput}")\n2. sources — an array of source documents to check the response against (you haven't provided any)\n\nHere are your options:\n\n• If you have source documents: Provide them as URIs or text content, and I'll audit the response against them.\n• If you're testing the audit system: You could provide a simple source like ["The Earth is the third planet from the Sun and orbits it annually"] and I'll run the audit.\n• If you want to see audit history instead: I can retrieve past audits using get_audit_log if you provide a date range.\n\nWould you like to:\n\n1. Provide some source documents now so I can run the audit?\n2. Check your existing audit history?\n3. Try a test audit with sample sources?\nLet me know how you'd like to proceed!`,
          }
        ],
        timestamp,
        sourceConflict: undefined,
        claims: [],
      };

      this.auditStore.add(emptyRecord);

      return {
        auditId,
        trustScore: 0,
        verdict: 'BLOCK',
        mismatches: emptyRecord.mismatches,
        timestamp,
        sourceConflict: undefined,
        claims: [],
      };
    }

    // Resolve any source reference names/URIs to their actual content
    const resolvedSources = input.sources.map(resolveSource);

    // Detect conflicts between the provided source documents
    const sourceConflict = detectSourceConflicts(resolvedSources);

    const { score, verdict, mismatches, claimDetails } = computeTrustScore(input.agentOutput, resolvedSources);

    // Convert scores/overlaps to 0-100 range
    const trustScore100 = Math.round(score * 100);

    const claims = claimDetails.map(c => ({
      claim: c.claim,
      status: c.supported ? 'supported' as const : (c.entityRatio >= 0.5 ? 'partial' as const : 'unsupported' as const),
      score: Math.round((c.supported ? 1 : (c.entityRatio >= 0.5 ? 0.5 : 0)) * 100),
      entityOverlap: Math.round(c.entityRatio * 100),
    }));

    // If there's a source conflict, add it as an informational mismatch
    const allMismatches = sourceConflict
      ? [{ claim: 'Source Document Conflict', sourceText: resolvedSources.join(' | '), issue: sourceConflict }, ...mismatches]
      : mismatches;

    const record: AuditRecord = {
      id: auditId,
      agentOutput: input.agentOutput,
      sources: input.sources,
      trustScore: trustScore100,
      verdict: sourceConflict && verdict === 'PASS' ? 'FLAG' : verdict,
      mismatches: allMismatches,
      timestamp,
      sourceConflict: sourceConflict ?? undefined,
      claims,
    };

    this.auditStore.add(record);

    return {
      auditId,
      trustScore: trustScore100,
      verdict: record.verdict,
      mismatches: allMismatches,
      timestamp,
      sourceConflict: sourceConflict ?? undefined,
      claims,
    };
  }

  @Tool({
    name: 'explain_audit',
    description: `Get detailed factual mismatches and citations for a previously completed audit by its ID.
CRITICAL: ALWAYS call this tool IMMEDIATELY when the user asks to explain, detail, review mismatches, or follow up on an audit result. Pass the auditId returned by audit_response directly to this tool.
If the audit ID is not found in the current session, the tool returns a helpful error message.`,
    inputSchema: z.object({
      auditId: z.string().describe('The audit ID returned by audit_response to explain'),
    }),
  })
  async explain_audit(
    input: { auditId: string },
    ctx: ExecutionContext
  ): Promise<{
    auditId: string;
    agentOutput: string;
    trustScore: number;
    verdict: 'PASS' | 'BLOCK' | 'FLAG';
    mismatches: Array<{ claim: string; sourceText: string; issue: string }>;
    sources: string[];
    timestamp: string;
    sourceConflict: string | undefined;
    claims: Claim[];
  }> {
    const record = this.auditStore.getById(input.auditId);

    if (!record) {
      throw new Error(`Audit ID not found: '${input.auditId}'. Please check the ID or use get_audit_log to find valid audit IDs within a date range.`);
    }

    return {
      auditId: record.id,
      agentOutput: record.agentOutput,
      trustScore: record.trustScore,
      verdict: record.verdict,
      mismatches: record.mismatches,
      sources: record.sources,
      timestamp: record.timestamp,
      sourceConflict: record.sourceConflict ?? undefined,
      claims: record.claims || [],
    };
  }
}

export class VerifyResources {
  @Resource({
    uri: 'resource://return_policy_official_document',
    name: 'Return Policy Document',
    description: 'Official return policy guidelines',
    mimeType: 'text/plain',
  })
  async getReturnPolicy(uri: string, ctx: ExecutionContext) {
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: 'Official Return Policy: Returns are accepted within 30 days of purchase with original receipt.'
      }]
    };
  }

  @Resource({
    uri: 'resource://product_specs_datasheet',
    name: 'Product Specs Datasheet',
    description: 'Detailed specifications for Model X',
    mimeType: 'text/plain',
  })
  async getProductSpecs(uri: string, ctx: ExecutionContext) {
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: 'Product Specifications: Model X has 16GB RAM and 512GB SSD storage.'
      }]
    };
  }

  @Resource({
    uri: 'resource://user_manual_draft',
    name: 'User Manual Draft',
    description: 'Draft version of the user manual',
    mimeType: 'text/plain',
  })
  async getUserManual(uri: string, ctx: ExecutionContext) {
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: 'User Manual: Model X battery life is up to 10 hours under normal usage.'
      }]
    };
  }

  @Resource({
    uri: 'resource://source_report_a',
    name: 'Source Report A',
    description: 'Financial performance report A',
    mimeType: 'text/plain',
  })
  async getReportA(uri: string, ctx: ExecutionContext) {
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: 'Report A: Q3 revenue was $15 million.'
      }]
    };
  }

  @Resource({
    uri: 'resource://source_report_b',
    name: 'Source Report B',
    description: 'Financial performance report B',
    mimeType: 'text/plain',
  })
  async getReportB(uri: string, ctx: ExecutionContext) {
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: 'Report B: Q3 profit margin was 12% and profit was $1.8 million.'
      }]
    };
  }
}
