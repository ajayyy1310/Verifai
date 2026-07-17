export interface Mismatch {
  claim: string;
  sourceText: string;
  issue: string;
}

export interface Claim {
  claim: string;
  status: 'supported' | 'partial' | 'contradicted' | 'unsupported';
  score: number;
  entityOverlap: number;
  bestSourceText?: string;
  jaccard?: number;
}

export interface AuditRecord {
  id: string;
  agentOutput: string;
  sources: string[];
  trustScore: number;
  verdict: 'PASS' | 'BLOCK' | 'FLAG';
  mismatches: Mismatch[];
  timestamp: string;
  imageUrl?: string;
  sourceConflict?: string;
  claims?: Claim[];
}
