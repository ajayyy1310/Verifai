import { ExecutionContext } from '@nitrostack/core';
interface Claim {
    claim: string;
    bestSourceText: string;
    jaccard: number;
    entityOverlap: number;
    score: number;
    status: 'supported' | 'contradicted' | 'unsupported';
}
interface AuditRecord {
    id: string;
    agentOutput: string;
    sources: string[];
    trustScore: number;
    verdict: 'PASS' | 'BLOCK';
    mismatches: Array<{
        claim: string;
        sourceText: string;
        issue: string;
    }>;
    timestamp: string;
    imageUrl?: string;
    claims: Claim[];
}
export declare class HistoryTools {
    get_audit_log(input: {
        startDate: string;
        endDate: string;
    }, ctx: ExecutionContext): Promise<{
        audits: AuditRecord[];
        totalCount: number;
        dateRange: {
            start: string;
            end: string;
        };
    }>;
    get_trust_summary(input: Record<string, never>, ctx: ExecutionContext): Promise<{
        totalAudits: number;
        passCount: number;
        blockCount: number;
        passRate: number;
        averageTrustScore: number;
        minTrustScore: number;
        maxTrustScore: number;
        trend: Array<{
            date: string;
            passRate: number;
            avgScore: number;
        }>;
    }>;
}
export {};
//# sourceMappingURL=history.tools.d.ts.map