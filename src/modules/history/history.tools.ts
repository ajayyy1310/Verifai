import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { AuditRecord } from '../../shared/types.js';
import { AuditStoreService } from '../shared/audit-store.service.js';

@Injectable({ deps: [AuditStoreService] })
export class HistoryTools {
  constructor(private readonly auditStore: AuditStoreService) {}

  @Tool({
    name: 'get_audit_log',
    description: `Retrieve audit history records filtered by a date range.
CRITICAL: ALWAYS call this tool IMMEDIATELY when the user requests audit history, logs, records, or mentions "last month", "past week", "yesterday", or any date range. Pass the user-supplied dates directly to this tool even if they appear invalid — the tool performs ALL date validation internally and returns appropriate error messages for:
- Invalid format (non-ISO)
- Impossible values (month > 12, day > 31)
- Illogical ranges (end date before start date)
NEVER pre-validate dates or answer conversationally. Always pass dates directly to this tool.`,
    inputSchema: z.object({
      startDate: z.string().describe('Start date supplied by the user (YYYY-MM-DD). Pass as-is; the tool validates it.'),
      endDate: z.string().describe('End date supplied by the user (YYYY-MM-DD). Pass as-is; the tool validates it.'),
    }),
  })
  @Widget('audit-feed')
  async get_audit_log(
    input: { startDate: string; endDate: string },
    ctx: ExecutionContext
  ): Promise<{
    audits: AuditRecord[];
    totalCount: number;
    dateRange: { start: string; end: string };
  }> {
    const parseAndValidateDate = (dateStr: string, paramName: string): Date => {
      const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) {
        throw new Error(`Invalid date format for ${paramName}. Please provide dates in ISO format (YYYY-MM-DD).`);
      }
      
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const day = parseInt(match[3]);
      
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        throw new Error(`I notice the ${paramName} you provided (${dateStr}) is invalid — it has an impossible month (${month}) and day (${day}).\n\nCould you clarify the date range you'd like? Please provide both dates in ISO format (YYYY-MM-DD), for example:\n\n• 2024-01-15 to 2024-01-01 (going backward)\n• 2024-01-01 to 2024-12-31 (full year 2024)\n• Or any other valid date range you have in mind\n\nOnce you confirm the correct dates, I'll fetch the audit log for you.`);
      }
      
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date value for ${paramName}: (${dateStr}).`);
      }
      return date;
    };

    const startDate = parseAndValidateDate(input.startDate, 'start date');
    const endDate = parseAndValidateDate(input.endDate, 'end date');

    if (startDate > endDate) {
      throw new Error('Invalid date range. Start date must be before or equal to end date.');
    }

    endDate.setHours(23, 59, 59, 999);

    const filtered = this.auditStore.getAll().filter(audit => {
      const auditDate = new Date(audit.timestamp);
      return auditDate >= startDate && auditDate <= endDate;
    });

    return {
      audits: filtered,
      totalCount: filtered.length,
      dateRange: { start: input.startDate, end: input.endDate },
    };
  }

  @Tool({
    name: 'get_trust_summary',
    description: 'Retrieve aggregate trust metrics and statistics across all historical audits, including pass rate, average score, min/max scores, and daily trend data. ALWAYS call this tool when the user asks about trust statistics, dashboards, or audit summaries.',
    inputSchema: z.object({}),
  })
  @Widget('trust-dashboard')
  async get_trust_summary(
    input: Record<string, never>,
    ctx: ExecutionContext
  ): Promise<{
    totalAudits: number;
    passCount: number;
    blockCount: number;
    passRate: number;
    averageTrustScore: number;
    minTrustScore: number;
    maxTrustScore: number;
    trend: Array<{ date: string; passRate: number; avgScore: number }>;
  }> {
    const audits = this.auditStore.getAll();
    const totalAudits = audits.length;
    const passCount = audits.filter(a => a.verdict === 'PASS').length;
    const blockCount = audits.filter(a => a.verdict === 'BLOCK').length;
    const passRate = totalAudits > 0 ? (passCount / totalAudits) * 100 : 0;
    const averageTrustScore = totalAudits > 0 ? audits.reduce((sum, a) => sum + a.trustScore, 0) / totalAudits : 0;
    const minTrustScore = totalAudits > 0 ? Math.min(...audits.map(a => a.trustScore)) : 0;
    const maxTrustScore = totalAudits > 0 ? Math.max(...audits.map(a => a.trustScore)) : 0;

    // Generate daily trend data
    const dailyStats = new Map<string, { passes: number; total: number; scores: number[] }>();
    audits.forEach(audit => {
      const date = audit.timestamp.split('T')[0];
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { passes: 0, total: 0, scores: [] });
      }
      const stats = dailyStats.get(date)!;
      stats.total++;
      stats.scores.push(audit.trustScore);
      if (audit.verdict === 'PASS') {
        stats.passes++;
      }
    });

    const trend = Array.from(dailyStats.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, stats]) => ({
        date,
        passRate: (stats.passes / stats.total) * 100,
        avgScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length,
      }));

    return {
      totalAudits,
      passCount,
      blockCount,
      passRate,
      averageTrustScore,
      minTrustScore,
      maxTrustScore,
      trend,
    };
  }
}
