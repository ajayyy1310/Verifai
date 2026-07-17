'use client';

import { useState, useEffect } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface TrendPoint {
  date: string;
  passRate: number;
  avgScore: number;
}

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

interface TrustSummaryData {
  totalAudits: number;
  passCount: number;
  flagCount?: number;
  blockCount: number;
  passRate: number;
  averageTrustScore: number;
  minTrustScore: number;
  maxTrustScore: number;
  trend: TrendPoint[];
}

export default function TrustDashboard() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const [mounted, setMounted] = useState(false);
  const [animateProgress, setAnimateProgress] = useState(0);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Loaded history data & stats
  const [historyData, setHistoryData] = useState<AuditRecord[]>([]);
  const [summaryData, setSummaryData] = useState<TrustSummaryData>({
    totalAudits: 0,
    passCount: 0,
    flagCount: 0,
    blockCount: 0,
    passRate: 0,
    averageTrustScore: 0,
    minTrustScore: 0,
    maxTrustScore: 0,
    trend: [],
  });

  const mockData: TrustSummaryData = {
    totalAudits: 12,
    passCount: 8,
    flagCount: 2,
    blockCount: 2,
    passRate: 66.7,
    averageTrustScore: 0.78,
    minTrustScore: 0.08,
    maxTrustScore: 0.96,
    trend: [
      { date: 'Jul 10', passRate: 100, avgScore: 0.95 },
      { date: 'Jul 11', passRate: 100, avgScore: 0.93 },
      { date: 'Jul 12', passRate: 50, avgScore: 0.515 },
      { date: 'Jul 13', passRate: 100, avgScore: 0.93 },
      { date: 'Jul 14', passRate: 50, avgScore: 0.49 },
      { date: 'Jul 15', passRate: 50, avgScore: 0.77 },
      { date: 'Jul 16', passRate: 50, avgScore: 0.755 },
    ]
  };

  const mockHistoryList: AuditRecord[] = [
  {
    "id": "audit_test_1",
    "agentOutput": "The company raised 45 million.",
    "sources": [
      "The company raised 45 million."
    ],
    "trustScore": 1,
    "verdict": "PASS",
    "mismatches": [],
    "timestamp": "2026-07-10T12:00:00Z"
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
    "timestamp": "2026-07-11T12:00:00Z"
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
    "timestamp": "2026-07-12T12:00:00Z"
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
    "timestamp": "2026-07-13T12:00:00Z"
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
    "timestamp": "2026-07-14T12:00:00Z"
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
    "timestamp": "2026-07-15T12:00:00Z"
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
    "timestamp": "2026-07-16T12:00:00Z"
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
    "timestamp": "2026-07-10T12:00:00Z"
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
    "timestamp": "2026-07-11T12:00:00Z"
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
    "timestamp": "2026-07-12T12:00:00Z"
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
    "timestamp": "2026-07-13T12:00:00Z"
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
    "timestamp": "2026-07-14T12:00:00Z"
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
    "timestamp": "2026-07-15T12:00:00Z"
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
    "timestamp": "2026-07-16T12:00:00Z"
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
    "timestamp": "2026-07-10T12:00:00Z"
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
    "timestamp": "2026-07-11T12:00:00Z"
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
    "timestamp": "2026-07-12T12:00:00Z"
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
    "timestamp": "2026-07-13T12:00:00Z"
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
    "timestamp": "2026-07-14T12:00:00Z"
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
    "timestamp": "2026-07-15T12:00:00Z"
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
    "timestamp": "2026-07-16T12:00:00Z"
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
    "timestamp": "2026-07-10T12:00:00Z"
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
    "timestamp": "2026-07-11T12:00:00Z"
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
    "timestamp": "2026-07-12T12:00:00Z"
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
    "timestamp": "2026-07-13T12:00:00Z"
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
    "timestamp": "2026-07-14T12:00:00Z"
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
    "timestamp": "2026-07-15T12:00:00Z"
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
    "timestamp": "2026-07-16T12:00:00Z"
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
    "timestamp": "2026-07-10T12:00:00Z"
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
    "timestamp": "2026-07-11T12:00:00Z"
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
    "timestamp": "2026-07-12T12:00:00Z"
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
    "timestamp": "2026-07-13T12:00:00Z"
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
    "timestamp": "2026-07-14T12:00:00Z"
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
    "timestamp": "2026-07-15T12:00:00Z"
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
    "timestamp": "2026-07-16T12:00:00Z"
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
    "timestamp": "2026-07-10T12:00:00Z"
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
    "timestamp": "2026-07-11T12:00:00Z"
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
    "timestamp": "2026-07-12T12:00:00Z"
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
    "timestamp": "2026-07-13T12:00:00Z"
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
    "timestamp": "2026-07-14T12:00:00Z"
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
    "timestamp": "2026-07-15T12:00:00Z"
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
    "timestamp": "2026-07-16T12:00:00Z"
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
    "timestamp": "2026-07-10T12:00:00Z"
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
    "timestamp": "2026-07-11T12:00:00Z"
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
    "timestamp": "2026-07-12T12:00:00Z"
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
    "timestamp": "2026-07-13T12:00:00Z"
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
    "timestamp": "2026-07-14T12:00:00Z"
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
    "timestamp": "2026-07-15T12:00:00Z"
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
    "timestamp": "2026-07-16T12:00:00Z"
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
    "timestamp": "2026-07-10T12:00:00Z"
  }
];

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

  const loadData = () => {
    try {
      const stored = localStorage.getItem('verifai-audits');
      let currentAudits: AuditRecord[] = [];
      if (stored) {
        currentAudits = JSON.parse(stored);
      } else {
        currentAudits = mockHistoryList;
      }
      setHistoryData(currentAudits);
      
      const totalAudits = currentAudits.length;
      const passCount = currentAudits.filter(a => a.verdict === 'PASS').length;
      const flagCount = currentAudits.filter(a => a.verdict === 'FLAG').length;
      const blockCount = currentAudits.filter(a => a.verdict === 'BLOCK').length;
      const passRate = totalAudits > 0 ? (passCount / totalAudits) * 100 : 0;
      const avgScore = totalAudits > 0 ? currentAudits.reduce((acc, a) => acc + a.trustScore, 0) / totalAudits : 0;
      const minScore = currentAudits.length > 0 ? Math.min(...currentAudits.map(a => a.trustScore)) : 0;
      const maxScore = currentAudits.length > 0 ? Math.max(...currentAudits.map(a => a.trustScore)) : 0;

      const trendMap = new Map<string, { pass: number, total: number, scoreSum: number }>();
      [...currentAudits].reverse().forEach(a => {
        const dateStr = formatDateShort(a.timestamp);
        if (!trendMap.has(dateStr)) trendMap.set(dateStr, { pass: 0, total: 0, scoreSum: 0 });
        const day = trendMap.get(dateStr)!;
        day.total++;
        if (a.verdict === 'PASS') day.pass++;
        day.scoreSum += a.trustScore;
      });
      
      let trend: TrendPoint[] = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        passRate: (data.pass / data.total) * 100,
        avgScore: data.scoreSum / data.total
      }));
      
      if (trend.length === 0) {
         trend = mockData.trend;
      }

      setSummaryData({
        totalAudits,
        passCount,
        flagCount,
        blockCount,
        passRate,
        averageTrustScore: avgScore,
        minTrustScore: minScore,
        maxTrustScore: maxScore,
        trend
      });
    } catch (e) {
      console.error(e);
      setHistoryData(mockHistoryList);
      setSummaryData(mockData);
    }
  };

  const formatDateShort = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDateLong = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    if (mounted) {
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  // SVG Gauge Arc drawing animation
  useEffect(() => {
    if (mounted && summaryData.averageTrustScore > 0) {
      const timer = setTimeout(() => {
        setAnimateProgress(summaryData.averageTrustScore);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mounted, summaryData.averageTrustScore]);

  // Color mappings
  const getPassRateColor = (rate: number) => {
    if (rate >= 80) return '#3fb950';
    if (rate >= 50) return '#d29922';
    return '#f85149';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#3fb950';
    if (score >= 0.4) return '#d29922';
    return '#f85149';
  };

  const getVerdictLabel = (score: number) => {
    if (score >= 0.8) return 'GOOD';
    if (score >= 0.4) return 'NEEDS REVIEW';
    return 'CRITICAL';
  };

  const getVerdictBadge = (verdict: string) => {
    if (verdict === 'PASS') return '#3fb950';
    if (verdict === 'FLAG') return '#d29922';
    return '#f85149';
  };

  // Sort worst audits (ascending order of score)
  const worstAudits = [...historyData]
    .sort((a, b) => a.trustScore - b.trustScore)
    .slice(0, 5);

  // SVG daily trend points computation
  const trend = summaryData.trend;
  const chartWidth = 500;
  const chartHeight = 200;
  const paddingX = 40;
  const paddingY = 30;

  const trendPoints = trend.map((t, i) => {
    const x = paddingX + (i / Math.max(trend.length - 1, 1)) * (chartWidth - 2 * paddingX);
    const y = chartHeight - paddingY - (t.avgScore * (chartHeight - 2 * paddingY));
    return { x, y, score: t.avgScore, date: t.date };
  });

  // Calculate smooth bezier path
  let linePathD = '';
  let areaPathD = '';
  if (trendPoints.length > 0) {
    linePathD = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
    for (let i = 0; i < trendPoints.length - 1; i++) {
      const p0 = trendPoints[i];
      const p1 = trendPoints[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      linePathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    areaPathD = `${linePathD} L ${trendPoints[trendPoints.length - 1].x} ${chartHeight - paddingY} L ${trendPoints[0].x} ${chartHeight - paddingY} Z`;
  }

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
        <div style={{ fontSize: '18px', color: '#8b949e' }}>Initializing Trust Metrics Dashboard...</div>
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
      <style dangerouslySetInnerHTML={{__html: `
        html, body {
          margin: 0;
          padding: 0;
          background-color: #0d1117;
          overflow: auto !important;
          overflow-y: auto !important;
          height: auto !important;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in-up-delay {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .trend-dot {
          transition: r 0.2s, stroke-width 0.2s;
          cursor: pointer;
        }
        .trend-dot:hover {
          r: 6;
          stroke-width: 3;
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
                Verifai Trust Dashboard
              </h1>
            </div>
            <p style={{
              margin: '4px 0 0 42px',
              fontSize: '14px',
              color: '#8b949e',
              fontWeight: 400,
            }}>
              Aggregate verification statistics and hallucination metrics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={loadData}
              style={{
                background: '#238636',
                color: '#ffffff',
                border: '1px solid rgba(240, 246, 252, 0.1)',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              🔄 Refresh
            </button>
            <div style={{
              fontSize: '13px',
              color: '#8b949e',
              background: '#0d1117',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid #30363d',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Live Polling Active
            </div>
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
        {/* Stats Row */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '32px',
        }}>
          {/* Card 1: Total Audits */}
          <div
            className="fade-in-up-delay"
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              padding: '24px',
              animationDelay: '0ms',
            }}
          >
            <div style={{ fontSize: '14px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Total Audits
            </div>
            <div style={{ fontSize: '48px', fontWeight: 700, color: '#f0f6fc', marginTop: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
              {summaryData.totalAudits}
            </div>
          </div>

          {/* Card 2: Pass Rate */}
          <div
            className="fade-in-up-delay"
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              padding: '24px',
              animationDelay: '50ms',
            }}
          >
            <div style={{ fontSize: '14px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Pass Rate
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: getPassRateColor(summaryData.passRate),
              marginTop: '12px',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {summaryData.passRate.toFixed(1)}%
            </div>
          </div>

          {/* Card 3: Avg Score */}
          <div
            className="fade-in-up-delay"
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              padding: '24px',
              animationDelay: '100ms',
            }}
          >
            <div style={{ fontSize: '14px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Avg Score
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: getScoreColor(summaryData.averageTrustScore),
              marginTop: '12px',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {summaryData.averageTrustScore.toFixed(2)}
            </div>
          </div>

          {/* Card 4: Blocked */}
          <div
            className="fade-in-up-delay"
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              padding: '24px',
              animationDelay: '150ms',
            }}
          >
            <div style={{ fontSize: '14px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Blocked
            </div>
            <div style={{ fontSize: '48px', fontWeight: 700, color: '#f85149', marginTop: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
              {summaryData.blockCount}
            </div>
          </div>
        </section>

        {/* Central Visualization Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.8fr',
          gap: '24px',
          marginBottom: '32px',
        }}>
          {/* Radial Trust Gauge Card */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <h3 style={{
              margin: '0 0 24px 0',
              fontSize: '15px',
              fontWeight: 600,
              color: '#8b949e',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Average Trust Index
            </h3>

            <div style={{ position: 'relative', width: '180px', height: '180px', marginBottom: '16px' }}>
              <svg width="100%" height="100%" viewBox="0 0 100 100">
                {/* Track circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#30363d"
                  strokeWidth="8"
                />
                {/* Progress arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={getScoreColor(summaryData.averageTrustScore)}
                  strokeWidth="8"
                  strokeDasharray="251.3"
                  strokeDashoffset={251.3 - (251.3 * animateProgress)}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{
                    transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </svg>
              {/* Inner score label */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  color: '#f0f6fc',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {(summaryData.averageTrustScore * 100).toFixed(0)}%
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: getScoreColor(summaryData.averageTrustScore),
                  letterSpacing: '0.05em',
                  marginTop: '2px',
                }}>
                  {getVerdictLabel(summaryData.averageTrustScore)}
                </span>
              </div>
            </div>

            <div style={{
              fontSize: '13px',
              color: '#8b949e',
              background: '#0d1117',
              padding: '6px 16px',
              borderRadius: '20px',
              border: '1px solid #30363d',
              textAlign: 'center',
            }}>
              System Health: <strong style={{ color: getScoreColor(summaryData.averageTrustScore) }}>
                {getVerdictLabel(summaryData.averageTrustScore)}
              </strong>
            </div>
          </div>

          {/* Verdict breakdown and Trend */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            {/* Verdict Breakdown Card */}
            <div style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              padding: '24px',
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: '#8b949e',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Verdict Distribution
              </h3>

              {/* Horizontal stacked bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* PASS */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#3fb950' }}>✓ PASS</span>
                    <span style={{ color: '#8b949e', fontFamily: "'JetBrains Mono', monospace" }}>
                      {summaryData.passCount} audits ({((summaryData.passCount / summaryData.totalAudits) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#30363d', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(summaryData.passCount / summaryData.totalAudits) * 100}%`,
                      height: '100%',
                      background: '#3fb950',
                      borderRadius: '4px',
                      transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                  </div>
                </div>

                {/* FLAG */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#d29922' }}>⚠ FLAG</span>
                    <span style={{ color: '#8b949e', fontFamily: "'JetBrains Mono', monospace" }}>
                      {summaryData.flagCount} audits ({(((summaryData.flagCount ?? 0) / summaryData.totalAudits) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#30363d', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${((summaryData.flagCount ?? 0) / summaryData.totalAudits) * 100}%`,
                      height: '100%',
                      background: '#d29922',
                      borderRadius: '4px',
                      transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                  </div>
                </div>

                {/* BLOCK */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#f85149' }}>✗ BLOCK</span>
                    <span style={{ color: '#8b949e', fontFamily: "'JetBrains Mono', monospace" }}>
                      {summaryData.blockCount} audits ({((summaryData.blockCount / summaryData.totalAudits) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#30363d', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(summaryData.blockCount / summaryData.totalAudits) * 100}%`,
                      height: '100%',
                      background: '#f85149',
                      borderRadius: '4px',
                      transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Daily Trend Chart Section */}
        <section style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '28px',
          marginBottom: '32px',
          position: 'relative',
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: '#8b949e',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Daily Trust Trend
          </h3>

          {trend.length > 0 ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <svg
                width="100%"
                height={chartHeight}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                style={{ overflow: 'visible' }}
              >
                {/* Horizontal grid lines */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((val) => {
                  const y = chartHeight - paddingY - (val * (chartHeight - 2 * paddingY));
                  return (
                    <g key={val}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="#30363d"
                        strokeWidth="0.5"
                        strokeDasharray="4,4"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 4}
                        fill="#8b949e"
                        fontSize="10"
                        fontFamily="'JetBrains Mono', monospace"
                        textAnchor="end"
                      >
                        {val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Area under the line */}
                {areaPathD && (
                  <path
                    d={areaPathD}
                    fill="url(#accent-gradient)"
                    opacity="0.1"
                  />
                )}

                {/* Main Trend Line */}
                {linePathD && (
                  <path
                    d={linePathD}
                    fill="none"
                    stroke="#58a6ff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data points */}
                {trendPoints.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill={getScoreColor(pt.score)}
                    stroke="#161b22"
                    strokeWidth="2"
                    className="trend-dot"
                    onMouseEnter={(e) => {
                      setHoveredTrendIndex(idx);
                      // Calculate positioning relative to parent bounding rect
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                      if (rect && parentRect) {
                        setTooltipPos({
                          x: rect.left - parentRect.left + 8,
                          y: rect.top - parentRect.top - 50,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredTrendIndex(null)}
                  />
                ))}

                {/* Gradients */}
                <defs>
                  <linearGradient id="accent-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#58a6ff" />
                    <stop offset="100%" stopColor="#58a6ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* X axis labels */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: `0 ${paddingX}px`,
                marginTop: '8px',
                fontSize: '11px',
                color: '#8b949e',
                fontWeight: 500,
              }}>
                {trend.map((t, idx) => (
                  <span key={idx} style={{ width: '40px', textAlign: 'center' }}>
                    {t.date}
                  </span>
                ))}
              </div>

              {/* Tooltip */}
              {hoveredTrendIndex !== null && trendPoints[hoveredTrendIndex] && (
                <div style={{
                  position: 'absolute',
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y}px`,
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  pointerEvents: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 10,
                  transform: 'translateX(-50%)',
                }}>
                  <div style={{ color: '#8b949e', fontWeight: 600, marginBottom: '2px' }}>
                    {trendPoints[hoveredTrendIndex].date}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#8b949e' }}>Trust Score:</span>
                    <strong style={{ color: getScoreColor(trendPoints[hoveredTrendIndex].score), fontFamily: 'monospace' }}>
                      {(trendPoints[hoveredTrendIndex].score * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#8b949e' }}>
              No trend data available.
            </div>
          )}
        </section>

        {/* Worst Hallucinations Table */}
        <section style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '24px',
          overflow: 'hidden',
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: '#8b949e',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Worst Detected Hallucinations
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '14px',
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Query / Output Snippet</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, width: '90px' }}>Score</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, width: '100px' }}>Verdict</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, width: '130px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {worstAudits.map((audit, idx) => (
                  <tr
                    key={audit.id}
                    style={{
                      borderBottom: idx === worstAudits.length - 1 ? 'none' : '1px solid #21262d',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)';
                    }}
                  >
                    <td style={{
                      padding: '16px',
                      color: '#f0f6fc',
                      lineHeight: '1.4',
                      maxWidth: '450px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      "{audit.agentOutput}"
                    </td>
                    <td style={{
                      padding: '16px',
                      fontWeight: 700,
                      color: getScoreColor(audit.trustScore),
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {(audit.trustScore * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: `${getVerdictBadge(audit.verdict)}1c`,
                        border: `1px solid ${getVerdictBadge(audit.verdict)}33`,
                        color: getVerdictBadge(audit.verdict),
                        fontSize: '11px',
                        fontWeight: 'bold',
                        letterSpacing: '0.02em',
                      }}>
                        {audit.verdict}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#8b949e', fontSize: '13px' }}>
                      {formatDateLong(audit.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
