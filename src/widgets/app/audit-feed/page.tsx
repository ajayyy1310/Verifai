'use client';

import { useState, useEffect } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { computeTrustScore } from '../../../modules/verify/verifier';

export const dynamic = 'force-dynamic';

interface Mismatch {
  claim: string;
  sourceText: string;
  issue: string;
}

interface ClaimResult {
  claim: string;
  bestSourceText: string;
  jaccard: number;
  entityOverlap: number;
  score: number;
  status: 'supported' | 'partial' | 'unsupported';
}

interface AuditRecord {
  id: string;
  agentOutput: string;
  sources: string[];
  trustScore: number;
  verdict: 'PASS' | 'BLOCK' | 'FLAG';
  mismatches: Mismatch[];
  timestamp: string;
  claims?: ClaimResult[];
}

interface AuditFeedData {
  audits: AuditRecord[];
  totalCount: number;
  dateRange: { start: string; end: string };
}

export default function AuditFeed() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const [mounted, setMounted] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [agentOutputInput, setAgentOutputInput] = useState('');
  const [sourcesInput, setSourcesInput] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Dynamic live audit result state
  const [liveResult, setLiveResult] = useState<AuditRecord | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Loaded history data & stats
  const [historyData, setHistoryData] = useState<AuditRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    passRate: 0,
    avgScore: 0,
    flagCount: 0,
    blockCount: 0,
  });

  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const mockData: AuditFeedData = {
    audits: [
      {
        "id": "audit_test_1",
        "agentOutput": "The company raised 45 million.",
        "sources": [
          "The company raised 45 million."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-10T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_2",
        "agentOutput": "John Doe visited Paris.",
        "sources": [
          "John Doe visited Paris."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-11T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_3",
        "agentOutput": "Inflation is at 5.5%.",
        "sources": [
          "Inflation is at 5.5%."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-12T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_4",
        "agentOutput": "apple reported 100 million.",
        "sources": [
          "Apple reported 100 million."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-13T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_5",
        "agentOutput": "He won 5 medals!",
        "sources": [
          "He won 5 medals."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-14T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_6",
        "agentOutput": "The revenue was $50 million.",
        "sources": [
          "Total revenue hit $50 million this year."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-15T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_7",
        "agentOutput": "1,000 people attended.",
        "sources": [
          "1000 people attended the event."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-16T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_8",
        "agentOutput": "In 2023, Tesla delivered 1.8 million cars.",
        "sources": [
          "Tesla delivered 1.8 million cars in 2023."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-10T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_9",
        "agentOutput": "SpaceX launched Falcon 9.",
        "sources": [
          "Yesterday, SpaceX launched Falcon 9 successfully."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-11T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_10",
        "agentOutput": "The new startup successfully raised $10 million.",
        "sources": [
          "The startup raised $10 million."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-12T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_11",
        "agentOutput": "The state-of-the-art facility cost $5 million.",
        "sources": [
          "The state of the art facility cost $5 million."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-13T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_12",
        "agentOutput": "Version 1.2.3 was released on 4.5.2023.",
        "sources": [
          "Version 1.2.3 was released on 4.5.2023."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-14T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_13",
        "agentOutput": "Google built a new campus and hired 500 engineers.",
        "sources": [
          "Google built a new campus. It hired 500 engineers."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-15T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_14",
        "agentOutput": "Google built a new campus and hired 500 engineers.",
        "sources": [
          "Google built a new campus. It hired 200 engineers."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Google built a new campus and hired 500 engineers",
            "sourceText": "Google built a new campus. It hired 200 engineers.",
            "issue": "Numbers in claim (500) not found in sources"
          }
        ],
        "timestamp": "2026-07-16T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_15",
        "agentOutput": "Growth was .5%.",
        "sources": [
          "Growth was 0.5%."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Growth was",
            "sourceText": "Growth was 0.5%.",
            "issue": "Low entity overlap (30%)"
          }
        ],
        "timestamp": "2026-07-10T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_16",
        "agentOutput": "Revenues grew by 5%.",
        "sources": [
          "Revenues grew by 10%. We had 5 new products."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Revenues grew by 5%",
            "sourceText": "Revenues grew by 10%. We had 5 new products.",
            "issue": "Numbers in claim (5%) not found in sources"
          }
        ],
        "timestamp": "2026-07-11T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_17",
        "agentOutput": "Profit is ₹100 crore.",
        "sources": [
          "Profit is 100 crore."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-12T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_18",
        "agentOutput": "100 million users.",
        "sources": [
          "100 billion users."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "100 million users",
            "sourceText": "100 billion users.",
            "issue": "Numbers in claim (100 million) not found in sources"
          }
        ],
        "timestamp": "2026-07-13T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_19",
        "agentOutput": "1,234,567 dollars.",
        "sources": [
          "1234567 dollars."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-14T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_20",
        "agentOutput": "High revenue growth.",
        "sources": [
          "Revenue grew 50%."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "High revenue growth",
            "sourceText": "Revenue grew 50%.",
            "issue": "Low entity overlap (33%)"
          }
        ],
        "timestamp": "2026-07-15T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_21",
        "agentOutput": "Wow.",
        "sources": [
          "Revenue grew 50%."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [],
        "timestamp": "2026-07-16T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_22",
        "agentOutput": "It is the.",
        "sources": [
          "It is the company."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "It is the",
            "sourceText": "It is the company.",
            "issue": "Low entity overlap (30%)"
          }
        ],
        "timestamp": "2026-07-10T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_23",
        "agentOutput": "Microsoft.",
        "sources": [
          "Microsoft grew 5%."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Microsoft",
            "sourceText": "Microsoft grew 5%.",
            "issue": "Low entity overlap (30%)"
          }
        ],
        "timestamp": "2026-07-11T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_24",
        "agentOutput": "Microsoft 5",
        "sources": [
          "Microsoft grew 5%."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Microsoft 5",
            "sourceText": "Microsoft grew 5%.",
            "issue": "Numbers in claim (5) not found in sources"
          }
        ],
        "timestamp": "2026-07-12T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_25",
        "agentOutput": "He won 500.",
        "sources": [
          "She won 500."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-13T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_26",
        "agentOutput": "A is 1. B is 2.",
        "sources": [
          "A is 1.\nB is 2."
        ],
        "trustScore": 0.5,
        "verdict": "FLAG",
        "mismatches": [
          {
            "claim": "A is 1",
            "sourceText": "A is 1. | B is 2.",
            "issue": "Low entity overlap (30%)"
          }
        ],
        "timestamp": "2026-07-14T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_27",
        "agentOutput": "Company X raised $10M from Y.",
        "sources": [
          "Company X raised $10M.\nThe funding was from Y."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-15T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_28",
        "agentOutput": "X is 10.",
        "sources": [
          "X is 5.\nX is 10."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-16T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_29",
        "agentOutput": "X is 10 and Y is 20.",
        "sources": [
          "X is 10.\nY is 15."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "X is 10 and Y is 20",
            "sourceText": "X is 10. | Y is 15.",
            "issue": "Numbers in claim (20) not found in sources"
          }
        ],
        "timestamp": "2026-07-10T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_30",
        "agentOutput": "X and Y went to Z.",
        "sources": [
          "X went to Z.\nY stayed home."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-11T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_31",
        "agentOutput": "Mars colonization starts in 2030.",
        "sources": [
          "SpaceX launched a rocket."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Mars colonization starts in 2030",
            "sourceText": "SpaceX launched a rocket.",
            "issue": "Numbers in claim (2030) not found in sources"
          }
        ],
        "timestamp": "2026-07-12T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_32",
        "agentOutput": "Apple launched iPhone 15.",
        "sources": [
          "Samsung launched Galaxy S24."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Apple launched iPhone 15",
            "sourceText": "Samsung launched Galaxy S24.",
            "issue": "Numbers in claim (15) not found in sources"
          }
        ],
        "timestamp": "2026-07-13T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_33",
        "agentOutput": "Revenue was 900.",
        "sources": [
          "Revenue was 100."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Revenue was 900",
            "sourceText": "Revenue was 100.",
            "issue": "Numbers in claim (900) not found in sources"
          }
        ],
        "timestamp": "2026-07-14T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_34",
        "agentOutput": "Total is 150.",
        "sources": [
          "A is 100. B is 50."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Total is 150",
            "sourceText": "A is 100. B is 50.",
            "issue": "Numbers in claim (150) not found in sources"
          }
        ],
        "timestamp": "2026-07-15T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_35",
        "agentOutput": "He visited Paris and London.",
        "sources": [
          "He visited Paris."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-16T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_36",
        "agentOutput": "U.S. GDP is 5%.",
        "sources": [
          "US GDP is 5%."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "U.S. GDP is 5%",
            "sourceText": "US GDP is 5%.",
            "issue": "Low entity overlap (33%)"
          }
        ],
        "timestamp": "2026-07-10T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_37",
        "agentOutput": "fifty percent.",
        "sources": [
          "50%."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "fifty percent",
            "sourceText": "50%.",
            "issue": "Low entity overlap (0%)"
          }
        ],
        "timestamp": "2026-07-11T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_38",
        "agentOutput": "Jan 1, 2024.",
        "sources": [
          "January 1st, 2024."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Jan 1, 2024",
            "sourceText": "January 1st, 2024.",
            "issue": "Numbers in claim (1, 2024) not found in sources"
          }
        ],
        "timestamp": "2026-07-12T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_39",
        "agentOutput": "Model-X15 cost $10.",
        "sources": [
          "Model X15 cost $10."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-13T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_40",
        "agentOutput": "He said \"Hello world\".",
        "sources": [
          "He said Hello world."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-14T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_41",
        "agentOutput": "A is 1; B is 2.",
        "sources": [
          "A is 1."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "A is 1",
            "sourceText": "A is 1.",
            "issue": "Low entity overlap (30%)"
          },
          {
            "claim": "B is 2",
            "sourceText": "A is 1.",
            "issue": "Numbers in claim (2) not found in sources"
          }
        ],
        "timestamp": "2026-07-15T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_42",
        "agentOutput": "Results: A is 1.",
        "sources": [
          "A is 1."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Results",
            "sourceText": "A is 1.",
            "issue": "Low entity overlap (0%)"
          },
          {
            "claim": "A is 1",
            "sourceText": "A is 1.",
            "issue": "Low entity overlap (30%)"
          }
        ],
        "timestamp": "2026-07-16T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_43",
        "agentOutput": "It rained heavily and the roads flooded, but we drove safely.",
        "sources": [
          "It rained heavily. The roads flooded."
        ],
        "trustScore": 0.6666666666666666,
        "verdict": "FLAG",
        "mismatches": [
          {
            "claim": "we drove safely",
            "sourceText": "It rained heavily. The roads flooded.",
            "issue": "Low entity overlap (0%)"
          }
        ],
        "timestamp": "2026-07-10T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_44",
        "agentOutput": "The report stated: 'Growth was 5%.'",
        "sources": [
          "The report stated growth was 5%."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-11T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_45",
        "agentOutput": "NASA launched.",
        "sources": [
          "National Aeronautics and Space Administration launched."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "NASA launched",
            "sourceText": "National Aeronautics and Space Administration launched.",
            "issue": "Claim not supported by sources"
          }
        ],
        "timestamp": "2026-07-12T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_46",
        "agentOutput": "1, 2, 3, 4, 5.",
        "sources": [
          "1, 2, 3."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "1, 2, 3, 4, 5",
            "sourceText": "1, 2, 3.",
            "issue": "Numbers in claim (4, 5) not found in sources"
          }
        ],
        "timestamp": "2026-07-13T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_47",
        "agentOutput": "A is 10, B is 20.",
        "sources": [
          "A is 20, B is 10."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-14T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_48",
        "agentOutput": "10.0.",
        "sources": [
          "10."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [],
        "timestamp": "2026-07-15T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_49",
        "agentOutput": "End.Start.",
        "sources": [
          "End. Start."
        ],
        "trustScore": 0,
        "verdict": "BLOCK",
        "mismatches": [
          {
            "claim": "Start",
            "sourceText": "End. Start.",
            "issue": "Low entity overlap (30%)"
          }
        ],
        "timestamp": "2026-07-16T12:00:00Z",
        "claims": []
      },
      {
        "id": "audit_test_50",
        "agentOutput": "Summary of events.",
        "sources": [
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA Summary of events."
        ],
        "trustScore": 1,
        "verdict": "PASS",
        "mismatches": [],
        "timestamp": "2026-07-10T12:00:00Z",
        "claims": []
      }
    ],
    totalCount: 50,
    dateRange: { start: '2026-07-10', end: '2026-07-16' },
  };

  const isStandalone = mounted && typeof window !== 'undefined' && window.self === window.top;
  const ready = isReady || isStandalone;

  // Load fonts and initialize mounted state
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      if (isReady) {
        const logRes: any = await callTool('get_audit_log', { startDate: '2026-07-10', endDate: '2026-07-17' });
        if (logRes && logRes.audits) {
          const normalizedAudits = logRes.audits.map((a: any) => {
            const normalizedScore = (a.trustScore > 1 ? a.trustScore / 100 : a.trustScore) || 0;
            return {
              ...a,
              trustScore: normalizedScore,
              verdict: (() => {
                const v = a.verdict?.trim()?.toUpperCase();
                if (v === 'PASS' || v === 'BLOCK' || v === 'FLAG') return v as 'PASS' | 'BLOCK' | 'FLAG';
                if (!a.claims || a.claims.length === 0) return 'BLOCK' as const;
                return (normalizedScore >= 0.8 ? 'PASS' : normalizedScore < 0.4 ? 'BLOCK' : 'FLAG') as 'PASS' | 'BLOCK' | 'FLAG';
              })(),
              claims: a.claims?.map((c: any) => ({
                ...c,
                score: (c.score > 1 ? c.score / 100 : c.score) || 0
              })) || []
            };
          });
          setHistoryData(normalizedAudits);
        } else {
          setHistoryData(mockData.audits);
        }

        const summaryRes: any = await callTool('get_trust_summary', {});
        if (summaryRes) {
          setStats({
            total: summaryRes?.totalAudits || 0,
            passRate: summaryRes?.passRate !== undefined ? (summaryRes.passRate <= 1 && summaryRes.passRate > 0 ? summaryRes.passRate * 100 : summaryRes.passRate) : 0,
            avgScore: summaryRes?.averageTrustScore !== undefined ? (summaryRes.averageTrustScore > 1 ? summaryRes.averageTrustScore / 100 : summaryRes.averageTrustScore) : 0,
            flagCount: summaryRes?.flagCount || 0,
            blockCount: summaryRes?.blockCount || 0,
          });
        } else {
          updateStatsFromList(mockData.audits);
        }
      } else {
        setHistoryData(mockData.audits);
        updateStatsFromList(mockData.audits);
      }
    } catch (e) {
      console.error(e);
      setHistoryData(mockData.audits);
      updateStatsFromList(mockData.audits);
    }
  };

  const updateStatsFromList = (list: AuditRecord[]) => {
    const safeList = list || [];
    const total = safeList.length;
    const passCount = safeList.filter(a => a.verdict === 'PASS').length;
    const flagCount = safeList.filter(a => a.verdict === 'FLAG').length;
    const blockCount = safeList.filter(a => a.verdict === 'BLOCK').length;
    setStats({
      total,
      passRate: total > 0 ? (passCount / total) * 100 : 0,
      avgScore: total > 0 ? list.reduce((acc, a) => acc + a.trustScore, 0) / total : 0,
      flagCount,
      blockCount,
    });
  };

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, isReady]);

  // Sync to localStorage whenever historyData changes
  useEffect(() => {
    if (mounted && historyData && historyData.length > 0) {
      localStorage.setItem('verifai-audits', JSON.stringify(historyData));
    }
  }, [historyData, mounted]);

  // Live count-up animation for scores
  useEffect(() => {
    if (liveResult) {
      let start = 0;
      const end = Math.round(liveResult.trustScore * 100);
      if (end === 0) {
        setAnimatedScore(0);
        return;
      }
      const duration = 1000;
      const stepTime = Math.abs(Math.floor(duration / end));
      const timer = setInterval(() => {
        start += 1;
        setAnimatedScore(start);
        if (start >= end) {
          clearInterval(timer);
        }
      }, Math.max(stepTime, 10));
      return () => clearInterval(timer);
    }
  }, [liveResult]);

  const handleAuditSubmit = async () => {
    if (!agentOutputInput.trim()) {
      setAuditError('Please paste an agent response');
      return;
    }
    if (!sourcesInput.trim()) {
      setAuditError('Please paste at least one source document');
      return;
    }

    setAuditError(null);
    setIsAuditing(true);
    setLiveResult(null);

    const sourcesArray = sourcesInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      if (isReady) {
        const result: any = await callTool('audit_response', {
          agentOutput: agentOutputInput,
          sources: sourcesArray,
        });

        if (result) {
          const normalizedTrustScore = (result.trustScore > 1 ? result.trustScore / 100 : result.trustScore) || 0;
          const newRecord: AuditRecord = {
            id: result.auditId,
            agentOutput: agentOutputInput,
            sources: sourcesArray,
            trustScore: normalizedTrustScore,
            verdict: (() => {
              const v = result.verdict?.trim()?.toUpperCase();
              if (v === 'PASS' || v === 'BLOCK' || v === 'FLAG') return v as 'PASS' | 'BLOCK' | 'FLAG';
              if (!result.claims || result.claims.length === 0) return 'BLOCK' as const;
              return (normalizedTrustScore >= 0.8 ? 'PASS' : normalizedTrustScore < 0.4 ? 'BLOCK' : 'FLAG') as 'PASS' | 'BLOCK' | 'FLAG';
            })(),
            mismatches: result.mismatches,
            timestamp: result.timestamp,
            claims: result.claims?.map((c: any) => ({
              ...c,
              score: (c.score > 1 ? c.score / 100 : c.score) || 0
            })) || [],
          };
          setLiveResult(newRecord);
          // Add to local history list
          setHistoryData(prev => [newRecord, ...prev]);
          // Re-calculate stats
          setStats(prev => {
            const newTotal = prev.total + 1;
            const newPass = prev.passRate * prev.total / 100 + (result.verdict === 'PASS' ? 1 : 0);
            return {
              total: newTotal,
              passRate: (newPass / newTotal) * 100,
              avgScore: (prev.avgScore * prev.total + result.trustScore) / newTotal,
              flagCount: prev.flagCount + (result.verdict === 'FLAG' ? 1 : 0),
              blockCount: prev.blockCount + (result.verdict === 'BLOCK' ? 1 : 0),
            };
          });
        } else {
          throw new Error('No result returned from audit tool.');
        }
      } else {
        // Fallback to local verifier when running in standalone browser mode
        setTimeout(() => {
          const { score, verdict, mismatches, claimDetails } = computeTrustScore(agentOutputInput, sourcesArray);

          const normalizedScore = claimDetails.length === 0 ? 0 : score;
          const finalVerdict: 'PASS' | 'BLOCK' | 'FLAG' = claimDetails.length === 0 ? 'BLOCK' : verdict;
          const newRecord: AuditRecord = {
            id: 'audit_live_' + Date.now(),
            agentOutput: agentOutputInput,
            sources: sourcesArray,
            trustScore: normalizedScore,
            verdict: finalVerdict,
            mismatches: mismatches,
            timestamp: new Date().toISOString(),
            claims: claimDetails.map((c: any) => ({
              claim: c.claim,
              bestSourceText: '', // computeTrustScore doesn't track best source text anymore
              jaccard: c.entityRatio, // map entity ratio to visual jaccard bar
              entityOverlap: c.entityRatio,
              score: c.supported ? 1 : (c.entityRatio < 0.5 ? 0 : 0.5), // approximate legacy score
              status: c.supported ? 'supported' : (c.entityRatio > 0.5 ? 'partial' : 'unsupported')
            }))
          };

          setLiveResult(newRecord);
          setHistoryData(prev => [newRecord, ...prev]);
          updateStatsFromList([newRecord, ...historyData]);
        }, 300);
      }
    } catch (e: any) {
      console.error(e);
      setAuditError('Verification error. Please try again.');
    } finally {
      setIsAuditing(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    if (verdict === 'PASS') return '#3fb950';
    if (verdict === 'FLAG') return '#d29922';
    return '#f85149';
  };

  const getVerdictLabel = (verdict: string) => {
    if (verdict === 'PASS') return '✓ PASS';
    if (verdict === 'FLAG') return '⚠ FLAG';
    return '✗ BLOCK';
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!ready) {
    return (
      <div style={{
        background: '#0d1117',
        color: '#f0f6fc',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ fontSize: '18px', color: '#8b949e' }}>Initializing Verifai Defense Layer...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#0d1117',
      color: '#f0f6fc',
      height: '100vh',
      overflowY: 'auto',
      width: '100%',
      fontFamily: "'Inter', sans-serif",
      paddingBottom: '80px',
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Custom styling elements */
        html, body {
          margin: 0;
          padding: 0;
          background-color: #0d1117;
          overflow: auto !important;
          overflow-y: auto !important;
          height: auto !important;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #161b22;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 3px;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-up {
          animation: fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* Header Bar */}
      <header style={{
        width: '100%',
        padding: '24px 40px',
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        position: 'relative',
        boxSizing: 'border-box',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '28px' }}>🛡️</span>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                color: '#f0f6fc',
                letterSpacing: '-0.02em',
              }}>
                Verifai
              </h1>
            </div>
            <p style={{
              margin: '4px 0 0 42px',
              fontSize: '14px',
              color: '#8b949e',
              fontWeight: 400,
            }}>
              Live Audit & Verification Dashboard
            </p>
          </div>
          <div style={{
            fontSize: '13px',
            color: '#8b949e',
            background: '#0d1117',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid #30363d',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Defense Layer Active
          </div>
        </div>
        {/* Subtle accent gradient bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #58a6ff 0%, rgba(88,166,255,0) 80%)',
        }}></div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '32px auto 0 auto',
        padding: '0 24px',
        boxSizing: 'border-box',
      }}>
        {/* Live Audit Section */}
        <section style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          marginBottom: '32px',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Header Toggle */}
          <div
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            style={{
              padding: '18px 24px',
              borderBottom: isFormExpanded ? '1px solid #30363d' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              background: '#161b22',
            }}
          >
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                display: 'inline-block',
                transform: isFormExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s ease',
                fontSize: '14px',
                color: '#8b949e'
              }}>▼</span>
              Live Audit Console
            </h2>
            <span style={{ fontSize: '13px', color: '#58a6ff' }}>
              {isFormExpanded ? 'Click to collapse' : 'Click to expand'}
            </span>
          </div>

          {/* Form Content */}
          <div style={{
            maxHeight: isFormExpanded ? '1500px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Agent Output Field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#8b949e',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Agent Output
                  </label>
                  <textarea
                    value={agentOutputInput}
                    onChange={(e) => setAgentOutputInput(e.target.value)}
                    placeholder="Paste the AI agent's output response text here..."
                    style={{
                      width: '100%',
                      height: '140px',
                      background: '#0d1117',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#f0f6fc',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      fontFamily: "'Inter', sans-serif",
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Source Documents Field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#8b949e',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Source Documents (one per line)
                  </label>
                  <textarea
                    value={sourcesInput}
                    onChange={(e) => setSourcesInput(e.target.value)}
                    placeholder="Paste corporate source document sentences here, one statement per line..."
                    style={{
                      width: '100%',
                      height: '140px',
                      background: '#0d1117',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#f0f6fc',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      fontFamily: "'Inter', sans-serif",
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {auditError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid rgba(248, 81, 73, 0.3)',
                  borderRadius: '6px',
                  color: '#f85149',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}>
                  ⚠️ {auditError}
                </div>
              )}

              <button
                onClick={handleAuditSubmit}
                disabled={isAuditing}
                style={{
                  background: '#58a6ff',
                  color: '#0d1117',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isAuditing ? 'not-allowed' : 'pointer',
                  opacity: isAuditing ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.2s',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isAuditing) e.currentTarget.style.background = '#79b6ff';
                }}
                onMouseLeave={(e) => {
                  if (!isAuditing) e.currentTarget.style.background = '#58a6ff';
                }}
              >
                {isAuditing ? '🔍 Auditing Response...' : '🔍 Audit This Response'}
              </button>

              {/* Dynamic Live Result Display */}
              {liveResult && (
                <div
                  className="animate-fade-up"
                  style={{
                    marginTop: '28px',
                    borderTop: '1px solid #30363d',
                    paddingTop: '24px',
                  }}
                >
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#8b949e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Live Verification Result
                  </h3>

                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    <div style={{
                      fontSize: '48px',
                      fontWeight: 'bold',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: getVerdictColor(liveResult.verdict),
                    }}>
                      {animatedScore}%
                    </div>
                    <div style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      background: `${getVerdictColor(liveResult.verdict)}22`,
                      border: `1px solid ${getVerdictColor(liveResult.verdict)}44`,
                      color: getVerdictColor(liveResult.verdict),
                      fontWeight: 700,
                      fontSize: '14px',
                    }}>
                      {getVerdictLabel(liveResult.verdict)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#8b949e' }}>
                      {liveResult.claims && liveResult.claims.length > 0 ? (
                        <>
                          {liveResult.claims.filter(c => c.status === 'supported').length} supported,{' '}
                          {liveResult.claims.filter(c => c.status !== 'supported').length} unverified of{' '}
                          {liveResult.claims.length} claims
                        </>
                      ) : liveResult.trustScore === 0 ? (
                        <span style={{ color: '#f85149', fontWeight: 500 }}>
                          ⚠ No verifiable claims found in input.
                        </span>
                      ) : (
                        `${liveResult.mismatches?.length || 0} mismatches detected`
                      )}
                    </div>
                  </div>

                  {/* Claims List */}
                  {liveResult.claims && liveResult.claims.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {liveResult.claims.map((claim, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '14px 16px',
                            background: '#0d1117',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${claim.status === 'supported' ? '#3fb950' : claim.status === 'partial' ? '#d29922' : '#f85149'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{
                              color: claim.status === 'supported' ? '#3fb950' : '#f85149',
                              fontWeight: 'bold',
                              fontSize: '16px',
                            }}>
                              {claim.status === 'supported' ? '✓' : '✗'}
                            </span>
                            <p style={{
                              margin: 0,
                              fontSize: '14px',
                              lineHeight: '1.4',
                              color: '#f0f6fc',
                            }}>
                              "{claim.claim}"
                            </p>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginLeft: '20px',
                          }}>
                            {/* Progress bar */}
                            <div style={{
                              flex: 1,
                              maxWidth: '120px',
                              height: '5px',
                              background: '#30363d',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${claim.score * 100}%`,
                                height: '100%',
                                background: claim.status === 'supported' ? '#3fb950' : claim.status === 'partial' ? '#d29922' : '#f85149',
                                borderRadius: '3px',
                              }} />
                            </div>
                            <span style={{
                              fontSize: '12px',
                              fontFamily: "'JetBrains Mono', monospace",
                              color: '#8b949e',
                            }}>
                              confidence: {(claim.score * 100).toFixed(0)}% —{' '}
                              <span style={{
                                color: claim.status === 'supported' ? '#3fb950' : claim.status === 'partial' ? '#d29922' : '#f85149',
                                fontWeight: 500,
                              }}>
                                {claim.status === 'supported' ? 'Supported' : claim.status === 'partial' ? 'Partially Supported' : 'Unsupported'}
                              </span>
                            </span>
                          </div>

                          {claim.bestSourceText && (
                            <div style={{
                              marginLeft: '20px',
                              fontSize: '12px',
                              color: '#8b949e',
                              background: '#161b22',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              border: '1px solid #30363d',
                            }}>
                              <span style={{ fontWeight: 600, color: '#f0f6fc' }}>Citation:</span> "{claim.bestSourceText}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          marginBottom: '40px',
        }}>
          {/* Card 1: Total Audits */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#58a6ff', fontFamily: "'JetBrains Mono', monospace" }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Audits
            </div>
          </div>

          {/* Card 2: Pass Rate */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#3fb950', fontFamily: "'JetBrains Mono', monospace" }}>
              {(stats.passRate || 0).toFixed(0)}%
            </div>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pass Rate
            </div>
          </div>

          {/* Card 3: Average Trust Score */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#f0f6fc', fontFamily: "'JetBrains Mono', monospace" }}>
              {(stats.avgScore || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Avg Score
            </div>
          </div>

          {/* Card 4: Flagged */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#d29922', fontFamily: "'JetBrains Mono', monospace" }}>
              {stats.flagCount}
            </div>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Flagged
            </div>
          </div>

          {/* Card 5: Blocked */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#f85149', fontFamily: "'JetBrains Mono', monospace" }}>
              {stats.blockCount}
            </div>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Blocked
            </div>
          </div>
        </section>

        {/* Audit History Section */}
        <section>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            marginBottom: '20px',
            color: '#f0f6fc',
          }}>
            Audit Log History
          </h2>

          {(!historyData || historyData.length === 0) ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 32px',
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '64px', opacity: 0.3, marginBottom: '16px' }}>🛡️</span>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#f0f6fc' }}>No audits yet</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#8b949e' }}>
                Paste an agent response above to get started
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}>
              {historyData.map((audit, i) => {
                const isExpanded = expandedAuditId === audit.id;
                return (
                  <div
                    key={audit.id}
                    onClick={() => setExpandedAuditId(isExpanded ? null : audit.id)}
                    style={{
                      background: '#161b22',
                      border: '1px solid #30363d',
                      borderLeft: `4px solid ${getVerdictColor(audit.verdict)}`,
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxSizing: 'border-box',
                      opacity: 0,
                      animation: 'fadeUp 0.35s ease-out forwards',
                      animationDelay: `${i * 40}ms`,
                      gridColumn: isExpanded ? '1 / -1' : 'auto',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = getVerdictColor(audit.verdict);
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#30363d';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '14px',
                    }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: `${getVerdictColor(audit.verdict)}1c`,
                        border: `1px solid ${getVerdictColor(audit.verdict)}33`,
                        color: getVerdictColor(audit.verdict),
                        fontSize: '11px',
                        fontWeight: 'bold',
                        letterSpacing: '0.02em',
                      }}>
                        {getVerdictLabel(audit.verdict)}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#8b949e',
                      }}>{formatDate(audit.timestamp)}</span>
                    </div>

                    {/* Progress score bar */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#8b949e' }}>Trust Score</span>
                        <span style={{
                          fontWeight: 'bold',
                          fontFamily: "'JetBrains Mono', monospace",
                          color: getVerdictColor(audit.verdict),
                        }}>{(audit.trustScore * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#30363d',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${audit.trustScore * 100}%`,
                          height: '100%',
                          background: getVerdictColor(audit.verdict),
                          borderRadius: '3px',
                        }} />
                      </div>
                    </div>

                    {/* Agent snippet / Full */}
                    <p style={{
                      margin: '0 0 16px 0',
                      fontSize: '13.5px',
                      lineHeight: '1.5',
                      color: isExpanded ? '#f0f6fc' : '#8b949e',
                      display: '-webkit-box',
                      WebkitLineClamp: isExpanded ? 'unset' : 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      "{audit.agentOutput}"
                    </p>

                    {/* Mismatch warnings count */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#8b949e',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {(audit.mismatches?.length || 0) > 0 ? (
                          <span style={{ color: '#d29922', fontWeight: 500 }}>
                            ⚠️ {audit.mismatches?.length} mismatch{audit.mismatches?.length !== 1 ? 'es' : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#3fb950' }}>✓ 0 mismatches</span>
                        )}
                      </div>
                      <span style={{ color: '#58a6ff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </span>
                    </div>

                    {/* Expandable Claims list */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '20px',
                        borderTop: '1px solid #30363d',
                        paddingTop: '20px',
                      }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#8b949e', textTransform: 'uppercase' }}>
                          Claim-by-claim verification breakdown:
                        </h4>

                        {audit.claims && audit.claims.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {audit.claims.map((claim, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '10px 12px',
                                  background: '#0d1117',
                                  borderRadius: '6px',
                                  borderLeft: `3px solid ${claim.status === 'supported' ? '#3fb950' : claim.status === 'partial' ? '#d29922' : '#f85149'}`,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                                  <span style={{ color: claim.status === 'supported' ? '#3fb950' : claim.status === 'partial' ? '#d29922' : '#f85149', fontWeight: 'bold' }}>
                                    {claim.status === 'supported' ? '✓' : '✗'}
                                  </span>
                                  <p style={{ margin: 0, fontSize: '13px', color: '#f0f6fc', lineHeight: '1.4' }}>
                                    "{claim.claim}"
                                  </p>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '11px',
                                  color: '#8b949e',
                                  marginLeft: '14px',
                                }}>
                                  <span>confidence: {(claim.score * 100).toFixed(0)}%</span>
                                  <span style={{ color: claim.status === 'supported' ? '#3fb950' : claim.status === 'partial' ? '#d29922' : '#f85149' }}>
                                    {claim.status === 'supported' ? 'Supported' : claim.status === 'partial' ? 'Partially Supported' : 'Unsupported'}
                                  </span>
                                </div>
                                {claim.bestSourceText && (
                                  <div style={{
                                    marginLeft: '14px',
                                    marginTop: '4px',
                                    fontSize: '11.5px',
                                    color: '#8b949e',
                                    background: '#161b22',
                                    padding: '4px 8px',
                                    borderRadius: '3px',
                                  }}>
                                    "{claim.bestSourceText}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Fallback to mismatches if claims are not populated
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(audit.mismatches || []).map((mismatch, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '10px 12px',
                                  background: '#0d1117',
                                  borderRadius: '6px',
                                  borderLeft: '3px solid #f85149',
                                }}
                              >
                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f85149', marginBottom: '2px' }}>
                                  Mismatch #{idx + 1}:
                                </div>
                                <div style={{ fontSize: '13px', color: '#f0f6fc', marginBottom: '4px' }}>
                                  "{mismatch.claim}"
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#8b949e' }}>
                                  <span style={{ fontWeight: 600, color: '#f0f6fc' }}>Issue:</span> {mismatch.issue}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
