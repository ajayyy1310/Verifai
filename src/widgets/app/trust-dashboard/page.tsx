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
  verdict: 'PASS' | 'FLAG' | 'BLOCK';
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
      id: 'audit_001',
      agentOutput: 'TechCorp India reported a revenue of ₹450 crore for FY2025, representing a 22% increase from the previous year.',
      sources: ['TechCorp India FY2025 financial statements show total revenue of ₹450 crore, growing 22% year-on-year.'],
      trustScore: 0.95,
      verdict: 'PASS',
      mismatches: [],
      timestamp: '2026-07-10T10:00:00Z'
    },
    {
      id: 'audit_002',
      agentOutput: 'As of March 2025, TechCorp India employs over 1800 professionals across its offices.',
      sources: ['Human Resource audit from March 2025 confirms total headcount of 1800 employees in TechCorp India.'],
      trustScore: 0.92,
      verdict: 'PASS',
      mismatches: [],
      timestamp: '2026-07-11T11:00:00Z'
    },
    {
      id: 'audit_003',
      agentOutput: 'The executive leadership of TechCorp India features CEO Priya Sharma and CTO Arjun Mehta.',
      sources: ['Corporate governance registry names Priya Sharma as Chief Executive Officer and Arjun Mehta as Chief Technology Officer.'],
      trustScore: 0.94,
      verdict: 'PASS',
      mismatches: [],
      timestamp: '2026-07-11T16:30:00Z'
    },
    {
      id: 'audit_004',
      agentOutput: 'TechCorp\'s flagship platform TechFlow is currently used by 200 enterprises globally.',
      sources: ['TechFlow enterprise client roster contains 200 verified corporate customers.'],
      trustScore: 0.91,
      verdict: 'PASS',
      mismatches: [],
      timestamp: '2026-07-12T09:15:00Z'
    },
    {
      id: 'audit_005',
      agentOutput: 'TechCorp India raised ₹200 crore in its Series C funding round led by Sequoia India.',
      sources: ['TechCorp India closed a ₹200 crore Series C funding round with Sequoia India as the lead investor.'],
      trustScore: 0.93,
      verdict: 'PASS',
      mismatches: [],
      timestamp: '2026-07-13T14:20:00Z'
    },
    {
      id: 'audit_006',
      agentOutput: 'TechCorp India announced a strategic partnership with Infosys in March 2025.',
      sources: ['Press release: TechCorp India and Infosys signed a joint partnership agreement in March 2025.'],
      trustScore: 0.90,
      verdict: 'PASS',
      mismatches: [],
      timestamp: '2026-07-14T12:00:00Z'
    },
    {
      id: 'audit_007',
      agentOutput: 'TechCorp India received the prestigious NASSCOM AI Innovation Award in 2024.',
      sources: ['NASSCOM 2024 award ceremony recognized TechCorp India for its pioneering work with the AI Innovation Award.'],
      trustScore: 0.96,
      verdict: 'PASS',
      mismatches: [],
      timestamp: '2026-07-15T09:00:00Z'
    },
    {
      id: 'audit_008',
      agentOutput: 'TechCorp India is compliant with SOC 2 Type II and ISO 27001 security certifications.',
      sources: ['Audit reports confirm TechCorp India maintains active SOC 2 Type II and ISO 27001 certifications.'],
      trustScore: 0.89,
      verdict: 'PASS',
      mismatches: [],
      timestamp: '2026-07-16T15:30:00Z'
    },
    {
      id: 'audit_009',
      agentOutput: 'TechCorp India announced the launch of its new payment product TechPay last week.',
      sources: ['TechCorp India documentation does not mention any product named TechPay.'],
      trustScore: 0.58,
      verdict: 'FLAG',
      mismatches: [
        {
          claim: 'Agent stated: "TechPay product launch"',
          sourceText: 'TechPay not in sources',
          issue: 'Fabricated product launch: TechPay is not found in source documents.'
        }
      ],
      timestamp: '2026-07-15T13:45:00Z'
    },
    {
      id: 'audit_010',
      agentOutput: 'TechCorp India operates its headquarters from Chennai.',
      sources: ['TechCorp India official registry lists its corporate headquarters in Delhi.'],
      trustScore: 0.62,
      verdict: 'FLAG',
      mismatches: [
        {
          claim: 'Agent stated: "headquarters from Chennai"',
          sourceText: 'Chennai not in sources',
          issue: 'Wrong office location: source document lists Delhi, not Chennai.'
        }
      ],
      timestamp: '2026-07-16T10:15:00Z'
    },
    {
      id: 'audit_011',
      agentOutput: 'Google has acquired TechCorp India for ₹5000 crore in cash.',
      sources: ['TechCorp India remains an independent private entity with no acquisition history.'],
      trustScore: 0.12,
      verdict: 'BLOCK',
      mismatches: [
        {
          claim: 'Agent stated: "Google has acquired TechCorp"',
          sourceText: 'completely fabricated',
          issue: 'Completely fabricated: No acquisition agreement has been signed.'
        }
      ],
      timestamp: '2026-07-12T16:20:00Z'
    },
    {
      id: 'audit_012',
      agentOutput: 'TechCorp India has launched its IPO on NSE at ₹1200 per share.',
      sources: ['TechCorp India is privately held and has not filed any draft prospectuses for an IPO.'],
      trustScore: 0.08,
      verdict: 'BLOCK',
      mismatches: [
        {
          claim: 'Agent stated: "IPO on NSE at ₹1200"',
          sourceText: 'completely fabricated',
          issue: 'Completely fabricated IPO claim: No public listings exist.'
        }
      ],
      timestamp: '2026-07-14T11:00:00Z'
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

  const loadData = async () => {
    try {
      if (isReady) {
        const logRes: any = await callTool('get_audit_log', { startDate: '2026-07-10', endDate: '2026-07-17' });
        if (logRes && logRes.audits) {
          setHistoryData(logRes.audits);
        } else {
          setHistoryData(mockHistoryList);
        }

        const summaryRes: any = await callTool('get_trust_summary', {});
        if (summaryRes) {
          const stats: TrustSummaryData = {
            totalAudits: summaryRes.totalAudits,
            passCount: summaryRes.passCount,
            flagCount: summaryRes.flagCount,
            blockCount: summaryRes.blockCount,
            passRate: summaryRes.passRate,
            averageTrustScore: summaryRes.averageTrustScore,
            minTrustScore: summaryRes.minTrustScore,
            maxTrustScore: summaryRes.maxTrustScore,
            trend: summaryRes.trend.map((t: any) => ({
              date: formatDateShort(t.date),
              passRate: t.passRate,
              avgScore: t.avgScore,
            })),
          };
          setSummaryData(stats);
        } else {
          setSummaryData(mockData);
        }
      } else {
        setHistoryData(mockHistoryList);
        setSummaryData(mockData);
      }
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
    }
  }, [mounted, isReady]);

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
