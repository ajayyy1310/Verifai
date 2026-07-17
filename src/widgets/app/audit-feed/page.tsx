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
        id: 'audit_001',
        agentOutput: 'TechCorp India reported a revenue of ₹450 crore for FY2025, representing a 22% increase from the previous year.',
        sources: ['TechCorp India FY2025 financial statements show total revenue of ₹450 crore, growing 22% year-on-year.'],
        trustScore: 0.95,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-10T10:00:00Z',
        claims: [
          {
            claim: 'TechCorp India reported a revenue of ₹450 crore for FY2025, representing a 22% increase from the previous year.',
            bestSourceText: 'TechCorp India FY2025 financial statements show total revenue of ₹450 crore, growing 22% year-on-year.',
            jaccard: 0.88,
            entityOverlap: 1.0,
            score: 0.95,
            status: 'supported'
          }
        ]
      },
      {
        id: 'audit_002',
        agentOutput: 'As of March 2025, TechCorp India employs over 1800 professionals across its offices.',
        sources: ['Human Resource audit from March 2025 confirms total headcount of 1800 employees in TechCorp India.'],
        trustScore: 0.92,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-11T11:00:00Z',
        claims: [
          {
            claim: 'As of March 2025, TechCorp India employs over 1800 professionals across its offices.',
            bestSourceText: 'Human Resource audit from March 2025 confirms total headcount of 1800 employees in TechCorp India.',
            jaccard: 0.82,
            entityOverlap: 1.0,
            score: 0.92,
            status: 'supported'
          }
        ]
      },
      {
        id: 'audit_003',
        agentOutput: 'The executive leadership of TechCorp India features CEO Priya Sharma and CTO Arjun Mehta.',
        sources: ['Corporate governance registry names Priya Sharma as Chief Executive Officer and Arjun Mehta as Chief Technology Officer.'],
        trustScore: 0.94,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-11T16:30:00Z',
        claims: [
          {
            claim: 'The executive leadership of TechCorp India features CEO Priya Sharma and CTO Arjun Mehta.',
            bestSourceText: 'Corporate governance registry names Priya Sharma as Chief Executive Officer and Arjun Mehta as Chief Technology Officer.',
            jaccard: 0.85,
            entityOverlap: 1.0,
            score: 0.94,
            status: 'supported'
          }
        ]
      },
      {
        id: 'audit_004',
        agentOutput: 'TechCorp\'s flagship platform TechFlow is currently used by 200 enterprises globally.',
        sources: ['TechFlow enterprise client roster contains 200 verified corporate customers.'],
        trustScore: 0.91,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-12T09:15:00Z',
        claims: [
          {
            claim: 'TechCorp\'s flagship platform TechFlow is currently used by 200 enterprises globally.',
            bestSourceText: 'TechFlow enterprise client roster contains 200 verified corporate customers.',
            jaccard: 0.78,
            entityOverlap: 1.0,
            score: 0.91,
            status: 'supported'
          }
        ]
      },
      {
        id: 'audit_005',
        agentOutput: 'TechCorp India raised ₹200 crore in its Series C funding round led by Sequoia India.',
        sources: ['TechCorp India closed a ₹200 crore Series C funding round with Sequoia India as the lead investor.'],
        trustScore: 0.93,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-13T14:20:00Z',
        claims: [
          {
            claim: 'TechCorp India raised ₹200 crore in its Series C funding round led by Sequoia India.',
            bestSourceText: 'TechCorp India closed a ₹200 crore Series C funding round with Sequoia India as the lead investor.',
            jaccard: 0.82,
            entityOverlap: 1.0,
            score: 0.93,
            status: 'supported'
          }
        ]
      },
      {
        id: 'audit_006',
        agentOutput: 'TechCorp India announced a strategic partnership with Infosys in March 2025.',
        sources: ['Press release: TechCorp India and Infosys signed a joint partnership agreement in March 2025.'],
        trustScore: 0.90,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-14T12:00:00Z',
        claims: [
          {
            claim: 'TechCorp India announced a strategic partnership with Infosys in March 2025.',
            bestSourceText: 'Press release: TechCorp India and Infosys signed a joint partnership agreement in March 2025.',
            jaccard: 0.75,
            entityOverlap: 1.0,
            score: 0.90,
            status: 'supported'
          }
        ]
      },
      {
        id: 'audit_007',
        agentOutput: 'TechCorp India received the prestigious NASSCOM AI Innovation Award in 2024.',
        sources: ['NASSCOM 2024 award ceremony recognized TechCorp India for its pioneering work with the AI Innovation Award.'],
        trustScore: 0.96,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-15T09:00:00Z',
        claims: [
          {
            claim: 'TechCorp India received the prestigious NASSCOM AI Innovation Award in 2024.',
            bestSourceText: 'NASSCOM 2024 award ceremony recognized TechCorp India for its pioneering work with the AI Innovation Award.',
            jaccard: 0.90,
            entityOverlap: 1.0,
            score: 0.96,
            status: 'supported'
          }
        ]
      },
      {
        id: 'audit_008',
        agentOutput: 'TechCorp India is compliant with SOC 2 Type II and ISO 27001 security certifications.',
        sources: ['Audit reports confirm TechCorp India maintains active SOC 2 Type II and ISO 27001 certifications.'],
        trustScore: 0.89,
        verdict: 'PASS',
        mismatches: [],
        timestamp: '2026-07-16T15:30:00Z',
        claims: [
          {
            claim: 'TechCorp India is compliant with SOC 2 Type II and ISO 27001 security certifications.',
            bestSourceText: 'Audit reports confirm TechCorp India maintains active SOC 2 Type II and ISO 27001 certifications.',
            jaccard: 0.72,
            entityOverlap: 1.0,
            score: 0.89,
            status: 'supported'
          }
        ]
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
        timestamp: '2026-07-15T13:45:00Z',
        claims: [
          {
            claim: 'TechCorp India announced the launch of its new payment product TechPay last week.',
            bestSourceText: 'TechCorp India documentation does not mention any product named TechPay.',
            jaccard: 0.45,
            entityOverlap: 0.66,
            score: 0.58,
            status: 'partial'
          }
        ]
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
        timestamp: '2026-07-16T10:15:00Z',
        claims: [
          {
            claim: 'TechCorp India operates its headquarters from Chennai.',
            bestSourceText: 'TechCorp India official registry lists its corporate headquarters in Delhi.',
            jaccard: 0.50,
            entityOverlap: 0.70,
            score: 0.62,
            status: 'partial'
          }
        ]
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
        timestamp: '2026-07-12T16:20:00Z',
        claims: [
          {
            claim: 'Google has acquired TechCorp India for ₹5000 crore in cash.',
            bestSourceText: 'TechCorp India remains an independent private entity with no acquisition history.',
            jaccard: 0.15,
            entityOverlap: 0.10,
            score: 0.12,
            status: 'unsupported'
          }
        ]
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
        timestamp: '2026-07-14T11:00:00Z',
        claims: [
          {
            claim: 'TechCorp India has launched its IPO on NSE at ₹1200 per share.',
            bestSourceText: 'TechCorp India is privately held and has not filed any draft prospectuses for an IPO.',
            jaccard: 0.10,
            entityOverlap: 0.05,
            score: 0.08,
            status: 'unsupported'
          }
        ]
      }
    ],
    totalCount: 12,
    dateRange: { start: '2026-07-10', end: '2026-07-17' },
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
          setHistoryData(logRes.audits);
        } else {
          setHistoryData(mockData.audits);
        }
        
        const summaryRes: any = await callTool('get_trust_summary', {});
        if (summaryRes) {
          setStats({
            total: summaryRes.totalAudits,
            passRate: summaryRes.passRate,
            avgScore: summaryRes.averageTrustScore,
            flagCount: summaryRes.flagCount,
            blockCount: summaryRes.blockCount,
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
    const total = list.length;
    const passCount = list.filter(a => a.verdict === 'PASS').length;
    const flagCount = list.filter(a => a.verdict === 'FLAG').length;
    const blockCount = list.filter(a => a.verdict === 'BLOCK').length;
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
          const newRecord: AuditRecord = {
            id: result.auditId,
            agentOutput: agentOutputInput,
            sources: sourcesArray,
            trustScore: result.trustScore,
            verdict: result.verdict,
            mismatches: result.mismatches,
            timestamp: result.timestamp,
            claims: result.claims,
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
          
          const newRecord: AuditRecord = {
            id: 'audit_live_' + Date.now(),
            agentOutput: agentOutputInput,
            sources: sourcesArray,
            trustScore: score,
            verdict: verdict,
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
      <style dangerouslySetInnerHTML={{__html: `
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
                      fontSize: '13px',
                      lineHeight: '1.5',
                      fontFamily: "'JetBrains Mono', monospace",
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
                      {liveResult.verdict}
                    </div>
                    <div style={{ fontSize: '13px', color: '#8b949e' }}>
                      {liveResult.claims ? (
                        <>
                          {liveResult.claims.filter(c => c.status === 'supported').length} supported,{' '}
                          {liveResult.claims.filter(c => c.status !== 'supported').length} unverified of{' '}
                          {liveResult.claims.length} claims
                        </>
                      ) : (
                        `${liveResult.mismatches.length} mismatches detected`
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
              {stats.passRate.toFixed(0)}%
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
              {stats.avgScore.toFixed(2)}
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

          {historyData.length === 0 ? (
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
                        {audit.mismatches.length > 0 ? (
                          <span style={{ color: '#d29922', fontWeight: 500 }}>
                            ⚠️ {audit.mismatches.length} mismatch{audit.mismatches.length !== 1 ? 'es' : ''}
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
                            {audit.mismatches.map((mismatch, idx) => (
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
