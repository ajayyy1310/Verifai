var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { randomUUID } from 'crypto';
import { computeTrustScore } from './verifier.js';
// In-memory audit store
const auditStore = new Map();
export class AuditTools {
    async audit_response(input, ctx) {
        const { score, verdict, mismatches } = computeTrustScore(input.agentOutput, input.sources);
        const auditId = randomUUID();
        const timestamp = new Date().toISOString();
        const record = {
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
    async explain_audit(input, ctx) {
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
__decorate([
    Tool({
        name: 'audit_response',
        description: 'Audit an AI agent response against source documents and compute a trust score',
        inputSchema: z.object({
            agentOutput: z.string().describe('The AI agent output to audit'),
            sources: z.array(z.string()).describe('Array of source documents to verify against'),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuditTools.prototype, "audit_response", null);
__decorate([
    Tool({
        name: 'explain_audit',
        description: 'Get detailed factual mismatches and citations for a specific audit',
        inputSchema: z.object({
            auditId: z.string().describe('The audit ID to explain'),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuditTools.prototype, "explain_audit", null);
//# sourceMappingURL=audit.tools.js.map