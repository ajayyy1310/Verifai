import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

// Mock audit data store (shared with verify module in production)
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
  verdict: 'PASS' | 'BLOCK' | 'FLAG';
  mismatches: Array<{ claim: string; sourceText: string; issue: string }>;
  timestamp: string;
  imageUrl?: string;
  claims: Claim[];
}

// In-memory mock data
const mockAudits: AuditRecord[] = [
  {
    id: 'audit_001',
    agentOutput: 'TechCorp India reported a revenue of ₹450 crore for FY2025, representing a 22% increase from the previous year.',
    sources: ['TechCorp India FY2025 financial statements show total revenue of ₹450 crore, growing 22% year-on-year.'],
    trustScore: 0.95,
    verdict: 'PASS',
    mismatches: [],
    timestamp: '2026-07-10T08:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'TechCorp India reported a revenue of ₹450 crore for FY2025, representing a 22% increase from the previous year.',
        bestSourceText: 'TechCorp India FY2025 financial statements show total revenue of ₹450 crore, growing 22% year-on-year.',
        jaccard: 0.88,
        entityOverlap: 1,
        score: 0.95,
        status: 'supported',
      },
    ],
  },
  {
    id: 'audit_002',
    agentOutput: 'As of March 2025, TechCorp India employs over 1800 professionals across its offices.',
    sources: ['Human Resource audit from March 2025 confirms total headcount of 1800 employees in TechCorp India.'],
    trustScore: 0.92,
    verdict: 'PASS',
    mismatches: [],
    timestamp: '2026-07-11T10:30:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'As of March 2025, TechCorp India employs over 1800 professionals across its offices.',
        bestSourceText: 'Human Resource audit from March 2025 confirms total headcount of 1800 employees in TechCorp India.',
        jaccard: 0.82,
        entityOverlap: 1,
        score: 0.92,
        status: 'supported',
      },
    ],
  },
  {
    id: 'audit_003',
    agentOutput: 'Water boils at 50 degrees Celsius',
    sources: ['Water boils at 100°C at sea level pressure.'],
    trustScore: 0.35,
    verdict: 'BLOCK',
    mismatches: [
      {
        claim: 'Agent stated: "50 degrees Celsius"',
        sourceText: 'Source states: 100°C at sea level',
        issue: 'Critical factual error: boiling point is 100°C, not 50°C',
      },
    ],
    timestamp: '2026-07-12T14:15:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1578926078328-123456789012?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'Water boils at 50 degrees Celsius',
        bestSourceText: 'Water boils at 100°C at sea level pressure.',
        jaccard: 0.35,
        entityOverlap: 0.5,
        score: 0.35,
        status: 'contradicted',
      },
    ],
  },
  {
    id: 'audit_004',
    agentOutput: 'The speed of light is 300,000 km/s',
    sources: ['The speed of light in vacuum is approximately 299,792 kilometers per second.'],
    trustScore: 0.88,
    verdict: 'PASS',
    mismatches: [
      {
        claim: 'Agent stated: "300,000"',
        sourceText: 'Source contains: 299,792',
        issue: 'Numeric value mismatch',
      },
    ],
    timestamp: '2026-07-13T09:45:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'The speed of light is 300,000 km/s',
        bestSourceText: 'The speed of light in vacuum is approximately 299,792 kilometers per second.',
        jaccard: 0.85,
        entityOverlap: 1,
        score: 0.88,
        status: 'supported',
      },
    ],
  },
  {
    id: 'audit_005',
    agentOutput: 'The Great Wall of China is 21,196 km long',
    sources: ['The Great Wall of China is approximately 21,196 kilometers in total length.'],
    trustScore: 0.98,
    verdict: 'PASS',
    mismatches: [],
    timestamp: '2026-07-14T11:20:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'The Great Wall of China is 21,196 km long',
        bestSourceText: 'The Great Wall of China is approximately 21,196 kilometers in total length.',
        jaccard: 0.92,
        entityOverlap: 1,
        score: 0.98,
        status: 'supported',
      },
    ],
  },
  {
    id: 'audit_006',
    agentOutput: 'Oxygen makes up 50% of Earth atmosphere',
    sources: ['Oxygen comprises approximately 21% of Earth\'s atmosphere.'],
    trustScore: 0.42,
    verdict: 'BLOCK',
    mismatches: [
      {
        claim: 'Agent stated: "50%"',
        sourceText: 'Source states: approximately 21%',
        issue: 'Significant overestimation: oxygen is ~21%, not 50%',
      },
    ],
    timestamp: '2026-07-15T13:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'Oxygen makes up 50% of Earth atmosphere',
        bestSourceText: 'Oxygen comprises approximately 21% of Earth\'s atmosphere.',
        jaccard: 0.42,
        entityOverlap: 0.8,
        score: 0.42,
        status: 'contradicted',
      },
    ],
  },
  {
    id: 'audit_007',
    agentOutput: 'The human body has 206 bones',
    sources: ['An adult human body typically contains 206 bones.'],
    trustScore: 0.94,
    verdict: 'PASS',
    mismatches: [],
    timestamp: '2026-07-16T15:30:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'The human body has 206 bones',
        bestSourceText: 'An adult human body typically contains 206 bones.',
        jaccard: 0.89,
        entityOverlap: 1,
        score: 0.94,
        status: 'supported',
      },
    ],
  },
  {
    id: 'audit_008',
    agentOutput: 'DNA has 4 nucleotide bases',
    sources: ['DNA contains four nucleotide bases: adenine, guanine, cytosine, and thymine.'],
    trustScore: 0.97,
    verdict: 'PASS',
    mismatches: [],
    timestamp: '2026-07-17T08:15:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'DNA has 4 nucleotide bases',
        bestSourceText: 'DNA contains four nucleotide bases: adenine, guanine, cytosine, and thymine.',
        jaccard: 0.91,
        entityOverlap: 1,
        score: 0.97,
        status: 'supported',
      },
    ],
  },
  {
    id: 'audit_009',
    agentOutput: 'Mount Everest is 8,849 meters tall',
    sources: ['Mount Everest reaches a height of 8,849 meters above sea level.'],
    trustScore: 0.99,
    verdict: 'PASS',
    mismatches: [],
    timestamp: '2026-07-10T16:45:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'Mount Everest is 8,849 meters tall',
        bestSourceText: 'Mount Everest reaches a height of 8,849 meters above sea level.',
        jaccard: 0.93,
        entityOverlap: 1,
        score: 0.99,
        status: 'supported',
      },
    ],
  },
  {
    id: 'audit_010',
    agentOutput: 'The Titanic sank in 1912',
    sources: ['The RMS Titanic sank on April 15, 1912.'],
    trustScore: 0.91,
    verdict: 'PASS',
    mismatches: [],
    timestamp: '2026-07-11T12:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'The Titanic sank in 1912',
        bestSourceText: 'The RMS Titanic sank on April 15, 1912.',
        jaccard: 0.87,
        entityOverlap: 1,
        score: 0.91,
        status: 'supported',
      },
    ],
  },
  {
    id: 'audit_011',
    agentOutput: 'The Amazon rainforest produces 80% of world oxygen',
    sources: ['The Amazon rainforest is estimated to produce about 20% of the world\'s oxygen.'],
    trustScore: 0.38,
    verdict: 'BLOCK',
    mismatches: [
      {
        claim: 'Agent stated: "80%"',
        sourceText: 'Source states: about 20%',
        issue: 'Severe hallucination: Amazon produces ~20% of oxygen, not 80%',
      },
    ],
    timestamp: '2026-07-12T10:30:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'The Amazon rainforest produces 80% of world oxygen',
        bestSourceText: 'The Amazon rainforest is estimated to produce about 20% of the world\'s oxygen.',
        jaccard: 0.38,
        entityOverlap: 0.7,
        score: 0.38,
        status: 'contradicted',
      },
    ],
  },
  {
    id: 'audit_012',
    agentOutput: 'The Eiffel Tower is 330 meters tall',
    sources: ['The Eiffel Tower stands at a height of 330 meters.'],
    trustScore: 0.93,
    verdict: 'PASS',
    mismatches: [],
    timestamp: '2026-07-13T14:20:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
    claims: [
      {
        claim: 'The Eiffel Tower is 330 meters tall',
        bestSourceText: 'The Eiffel Tower stands at a height of 330 meters.',
        jaccard: 0.90,
        entityOverlap: 1,
        score: 0.93,
        status: 'supported',
      },
    ],
  },
];

export class HistoryTools {
  @Tool({
    name: 'get_audit_log',
    description: 'Get audit history within a date range',
    inputSchema: z.object({
      startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
      endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
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
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(input.startDate) || !isoRegex.test(input.endDate)) {
      throw new Error('Invalid date format. Please provide dates in ISO format (YYYY-MM-DD).');
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date value. Please check the date values or provide them in ISO format (YYYY-MM-DD).');
    }

    if (startDate > endDate) {
      throw new Error('Invalid date range. Start date must be before or equal to end date.');
    }

    endDate.setHours(23, 59, 59, 999);

    const filtered = mockAudits.filter(audit => {
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
    description: 'Get aggregate trust statistics across all audits',
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
    const totalAudits = mockAudits.length;
    const passCount = mockAudits.filter(a => a.verdict === 'PASS').length;
    const blockCount = mockAudits.filter(a => a.verdict === 'BLOCK').length;
    const passRate = totalAudits > 0 ? (passCount / totalAudits) * 100 : 0;
    const averageTrustScore = totalAudits > 0 ? mockAudits.reduce((sum, a) => sum + a.trustScore, 0) / totalAudits : 0;
    const minTrustScore = totalAudits > 0 ? Math.min(...mockAudits.map(a => a.trustScore)) : 0;
    const maxTrustScore = totalAudits > 0 ? Math.max(...mockAudits.map(a => a.trustScore)) : 0;

    // Generate daily trend data
    const dailyStats = new Map<string, { passes: number; total: number; scores: number[] }>();
    mockAudits.forEach(audit => {
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
