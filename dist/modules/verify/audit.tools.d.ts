import { ExecutionContext } from '@nitrostack/core';
export declare class AuditTools {
    audit_response(input: {
        agentOutput: string;
        sources: string[];
    }, ctx: ExecutionContext): Promise<{
        auditId: string;
        trustScore: number;
        verdict: 'PASS' | 'BLOCK';
        mismatches: Array<{
            claim: string;
            sourceText: string;
            issue: string;
        }>;
        timestamp: string;
    }>;
    explain_audit(input: {
        auditId: string;
    }, ctx: ExecutionContext): Promise<{
        auditId: string;
        agentOutput: string;
        trustScore: number;
        verdict: 'PASS' | 'BLOCK';
        mismatches: Array<{
            claim: string;
            sourceText: string;
            issue: string;
        }>;
        sources: string[];
        timestamp: string;
    }>;
}
//# sourceMappingURL=audit.tools.d.ts.map