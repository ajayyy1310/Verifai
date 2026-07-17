import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { randomUUID } from 'crypto';
import { computeTrustScore } from './verifier.js';

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

    // If no sources are provided, return a low-confidence result explaining that no sources were provided
    // and prompting the user to specify which documents or resources should be used for verification
    if (!input.sources || input.sources.length === 0) {
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
            issue: "I'd be happy to help audit that AI response, but I need the source document(s) to verify it against. Please specify which documents or resources should be used for verification.",
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
