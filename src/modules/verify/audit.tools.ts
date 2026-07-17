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
  }> {
    const { score, verdict, mismatches } = computeTrustScore(input.agentOutput, input.sources);
    const auditId = randomUUID();
    const timestamp = new Date().toISOString();

    const record: AuditRecord = {
      id: auditId,
      agentOutput: input.agentOutput,
      sources: input.sources,
      trustScore: score,
      verdict,
      mismatches,
      timestamp,
    };

    auditStore.set(auditId, record);

    return {
      auditId,
      trustScore: score,
      verdict,
      mismatches,
      timestamp,
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
  }> {
    const record = auditStore.get(input.auditId);

    if (!record) {
      throw new Error(`Audit not found: ${input.auditId}`);
    }

    return {
      auditId: record.id,
      agentOutput: record.agentOutput,
      trustScore: record.trustScore,
      verdict: record.verdict,
      mismatches: record.mismatches,
      sources: record.sources,
      timestamp: record.timestamp,
    };
  }
}
