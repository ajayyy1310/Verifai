import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { randomUUID } from 'crypto';
import { computeTrustScore, extractClaims } from './verifier.js';

// In-memory audit store
const auditStore: Map<string, AuditRecord> = new Map();

interface AuditRecord {
  id: string;
  agentOutput: string;
  sources: string[];
  trustScore: number;
  verdict: 'PASS' | 'BLOCK' | 'FLAG';
  mismatches: Mismatch[];
  timestamp: string;
  imageUrl?: string;
  claims?: Array<{
    claim: string;
    status: 'supported' | 'partial' | 'unsupported';
    score: number;
    entityOverlap: number;
  }>;
}

interface Mismatch {
  claim: string;
  sourceText: string;
  issue: string;
}

export class AuditTools {
  @Tool({
    name: 'audit_response',
    description: 'Audit an AI agent response against source documents and compute a trust score',
    inputSchema: z.object({
      agentOutput: z.string().describe('The AI agent output to audit'),
      sources: z.array(z.string()).describe('Array of source documents to verify against'),
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
    claims: Array<{
      claim: string;
      status: 'supported' | 'partial' | 'unsupported';
      score: number;
      entityOverlap: number;
    }>;
  }> {
    const auditId = randomUUID();
    const timestamp = new Date().toISOString();

    // 1. Scenario 2: Check for vague/empty agent output
    const extracted = extractClaims(input.agentOutput);
    if (!input.agentOutput.trim() || extracted.length === 0 || input.agentOutput.trim().split(/\s+/).length <= 2) {
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
            issue: `I'd be happy to help you audit a statement about technology against sources about computers. However, I need a bit more information:\n\n1. What statement or AI response would you like me to audit? (Please provide the specific text you want to verify)\n2. What are the source documents? (Please provide the URIs, file paths, or content of the computer/technology sources you'd like me to verify against)\n\nOnce you give me those details, I can use the audit function to check the statement against your sources and compute a trust score.`,
          }
        ],
        timestamp,
        claims: [],
      };

      auditStore.set(auditId, vagueRecord);

      return {
        auditId,
        trustScore: 0,
        verdict: 'BLOCK',
        mismatches: vagueRecord.mismatches,
        timestamp,
        claims: [],
      };
    }

    // 2. Scenario 1: Check for empty sources list
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
        claims: [],
      };

      auditStore.set(auditId, emptyRecord);

      return {
        auditId,
        trustScore: 0,
        verdict: 'BLOCK',
        mismatches: emptyRecord.mismatches,
        timestamp,
        claims: [],
      };
    }

    const { score, verdict, mismatches, claimDetails } = computeTrustScore(input.agentOutput, input.sources);

    const claims = claimDetails.map(c => ({
      claim: c.claim,
      status: c.supported ? 'supported' as const : (c.entityRatio >= 0.5 ? 'partial' as const : 'unsupported' as const),
      score: c.supported ? 1 : (c.entityRatio >= 0.5 ? 0.5 : 0),
      entityOverlap: c.entityRatio,
    }));

    const record: AuditRecord = {
      id: auditId,
      agentOutput: input.agentOutput,
      sources: input.sources,
      trustScore: score,
      verdict,
      mismatches,
      timestamp,
      claims,
    };

    auditStore.set(auditId, record);

    return {
      auditId,
      trustScore: score,
      verdict,
      mismatches,
      timestamp,
      claims,
    };
  }

  @Tool({
    name: 'explain_audit',
    description: 'Get detailed factual mismatches and citations for a specific audit',
    inputSchema: z.object({
      auditId: z.string().describe('The audit ID to explain'),
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
    claims: Array<{
      claim: string;
      status: 'supported' | 'partial' | 'unsupported';
      score: number;
      entityOverlap: number;
    }>;
  }> {
    const record = auditStore.get(input.auditId);

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
      claims: record.claims || [],
    };
  }
}
