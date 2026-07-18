import { Injectable } from '@nitrostack/core';
import { AuditRecord } from '../../shared/types.js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuditStoreService {
  private records: Map<string, AuditRecord> = new Map();
  private readonly filePath = path.join(process.cwd(), 'fixtures', 'live_audits.json');

  constructor() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const list: AuditRecord[] = JSON.parse(raw);
        list.forEach(r => this.records.set(r.id, r));
        return;
      } catch (err) {
        // Fallback to default mock records
      }
    }

    // Initialize with mock history records normalized to 0-100 scale
    const mockAudits: AuditRecord[] = [
      {
        id: 'audit_001',
        agentOutput: 'TechCorp India reported a revenue of ₹450 crore for FY2025, representing a 22% increase from the previous year.',
        sources: ['TechCorp India FY2025 financial statements show total revenue of ₹450 crore, growing 22% year-on-year.'],
        trustScore: 95,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-10T08:00:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=300&fit=crop',
        claims: [
          {
            claim: 'TechCorp India reported a revenue of ₹450 crore for FY2025, representing a 22% increase from the previous year.',
            bestSourceText: 'TechCorp India FY2025 financial statements show total revenue of ₹450 crore, growing 22% year-on-year.',
            jaccard: 88,
            entityOverlap: 100,
            score: 95,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_002',
        agentOutput: 'As of March 2025, TechCorp India employs over 1800 professionals across its offices.',
        sources: ['Human Resource audit from March 2025 confirms total headcount of 1800 employees in TechCorp India.'],
        trustScore: 92,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-11T10:30:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=300&fit=crop',
        claims: [
          {
            claim: 'As of March 2025, TechCorp India employs over 1800 professionals across its offices.',
            bestSourceText: 'Human Resource audit from March 2025 confirms total headcount of 1800 employees in TechCorp India.',
            jaccard: 82,
            entityOverlap: 100,
            score: 92,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_003',
        agentOutput: 'Water boils at 50 degrees Celsius',
        sources: ['Water boils at 100°C at sea level pressure.'],
        trustScore: 35,
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
            jaccard: 35,
            entityOverlap: 50,
            score: 35,
            status: 'contradicted',
          },
        ],
      },
      {
        id: 'audit_004',
        agentOutput: 'The speed of light is 300,000 km/s',
        sources: ['The speed of light in vacuum is approximately 299,792 kilometers per second.'],
        trustScore: 88,
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
            jaccard: 85,
            entityOverlap: 100,
            score: 88,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_005',
        agentOutput: 'The Great Wall of China is 21,196 km long',
        sources: ['The Great Wall of China is approximately 21,196 kilometers in total length.'],
        trustScore: 98,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-14T11:20:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop',
        claims: [
          {
            claim: 'The Great Wall of China is 21,196 km long',
            bestSourceText: 'The Great Wall of China is approximately 21,196 kilometers in total length.',
            jaccard: 92,
            entityOverlap: 100,
            score: 98,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_006',
        agentOutput: 'Oxygen makes up 50% of Earth atmosphere',
        sources: ['Oxygen comprises approximately 21% of Earth\'s atmosphere.'],
        trustScore: 42,
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
            jaccard: 42,
            entityOverlap: 80,
            score: 42,
            status: 'contradicted',
          },
        ],
      },
      {
        id: 'audit_007',
        agentOutput: 'The human body has 206 bones',
        sources: ['An adult human body typically contains 206 bones.'],
        trustScore: 94,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-16T15:30:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=400&h=300&fit=crop',
        claims: [
          {
            claim: 'The human body has 206 bones',
            bestSourceText: 'An adult human body typically contains 206 bones.',
            jaccard: 89,
            entityOverlap: 100,
            score: 94,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_008',
        agentOutput: 'DNA has 4 nucleotide bases',
        sources: ['DNA contains four nucleotide bases: adenine, guanine, cytosine, and thymine.'],
        trustScore: 97,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-17T08:15:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&h=300&fit=crop',
        claims: [
          {
            claim: 'DNA has 4 nucleotide bases',
            bestSourceText: 'DNA contains four nucleotide bases: adenine, guanine, cytosine, and thymine.',
            jaccard: 91,
            entityOverlap: 100,
            score: 97,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_009',
        agentOutput: 'Mount Everest is 8,849 meters tall',
        sources: ['Mount Everest reaches a height of 8,849 meters above sea level.'],
        trustScore: 99,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-10T16:45:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        claims: [
          {
            claim: 'Mount Everest is 8,849 meters tall',
            bestSourceText: 'Mount Everest reaches a height of 8,849 meters above sea level.',
            jaccard: 93,
            entityOverlap: 100,
            score: 99,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_010',
        agentOutput: 'The Titanic sank in 1912',
        sources: ['The RMS Titanic sank on April 15, 1912.'],
        trustScore: 91,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-11T12:00:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=400&h=300&fit=crop',
        claims: [
          {
            claim: 'The Titanic sank in 1912',
            bestSourceText: 'The RMS Titanic sank on April 15, 1912.',
            jaccard: 87,
            entityOverlap: 100,
            score: 91,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_011',
        agentOutput: 'The Amazon rainforest produces 80% of world oxygen',
        sources: ['The Amazon rainforest is estimated to produce about 20% of the world\'s oxygen.'],
        trustScore: 38,
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
            jaccard: 38,
            entityOverlap: 70,
            score: 38,
            status: 'contradicted',
          },
        ],
      },
      {
        id: 'audit_012',
        agentOutput: 'The Eiffel Tower is 330 meters tall',
        sources: ['The Eiffel Tower stands at a height of 330 meters.'],
        trustScore: 93,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-13T14:20:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
        claims: [
          {
            claim: 'The Eiffel Tower is 330 meters tall',
            bestSourceText: 'The Eiffel Tower stands at a height of 330 meters.',
            jaccard: 90,
            entityOverlap: 100,
            score: 93,
            status: 'supported',
          },
        ],
      },
      {
        id: 'audit_013',
        agentOutput: 'Warranty coverage lasts 2 years from purchase date',
        sources: ['Warranty Terms: All products include a 1-year limited guarantee against manufacturing defects from purchase date. Accidental damage and misuse are excluded.'],
        trustScore: 15,
        verdict: 'BLOCK',
        mismatches: [
          {
            claim: 'Warranty coverage lasts 2 years from purchase date',
            sourceText: 'All products include a 1-year limited guarantee against manufacturing defects from purchase date.',
            issue: 'Incorrect warranty duration: source specifies 1 year, agent claimed 2 years',
          },
        ],
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        claims: [
          {
            claim: 'Warranty coverage lasts 2 years from purchase date',
            bestSourceText: 'All products include a 1-year limited guarantee against manufacturing defects from purchase date.',
            jaccard: 15,
            entityOverlap: 50,
            score: 15,
            status: 'contradicted',
          },
        ],
      },
      {
        id: 'audit_014',
        agentOutput: 'The warranty covers all types of damage including physical damage',
        sources: ['Warranty Terms: All products include a 1-year limited guarantee against manufacturing defects from purchase date. Accidental damage and misuse are excluded.'],
        trustScore: 20,
        verdict: 'BLOCK',
        mismatches: [
          {
            claim: 'The warranty covers all types of damage including physical damage',
            sourceText: 'Accidental damage and misuse are excluded from the warranty.',
            issue: 'Hallucination: warranty explicitly excludes physical/accidental damage',
          },
        ],
        timestamp: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        claims: [
          {
            claim: 'The warranty covers all types of damage including physical damage',
            bestSourceText: 'Accidental damage and misuse are excluded.',
            jaccard: 20,
            entityOverlap: 60,
            score: 20,
            status: 'contradicted',
          },
        ],
      },
    ];

    mockAudits.forEach(record => {
      this.records.set(record.id, record);
    });
    this.saveToDisk();
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.getAll(), null, 2), 'utf8');
    } catch (err) {
      // Ignore write errors to prevent crashing
    }
  }

  getAll(): AuditRecord[] {
    return Array.from(this.records.values());
  }

  getById(id: string): AuditRecord | undefined {
    return this.records.get(id);
  }

  add(record: AuditRecord): void {
    this.records.set(record.id, record);
    this.saveToDisk();
  }
}
