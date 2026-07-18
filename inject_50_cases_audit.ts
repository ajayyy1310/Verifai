import * as fs from 'fs';

const results = JSON.parse(fs.readFileSync('test_50_results.json', 'utf8'));

const mockHistoryList = results.map((test: any, index: number) => {
  const day = (index % 7) + 10; // Jul 10 to Jul 16
  return {
    id: `audit_test_${index + 1}`,
    agentOutput: test.agent,
    sources: [test.source],
    trustScore: test.score,
    verdict: test.actualVerdict,
    mismatches: test.mismatches,
    timestamp: `2026-07-${day}T12:00:00Z`,
    claims: []
  };
});

const tsCode = `  const mockData: AuditFeedData = {
    audits: ${JSON.stringify(mockHistoryList, null, 2)},
    totalCount: 50,
    dateRange: { start: '2026-07-10', end: '2026-07-16' },
  };`;

// Read audit-feed/page.tsx
const pageContent = fs.readFileSync('src/widgets/app/audit-feed/page.tsx', 'utf8');

// Replace mockData
const startStr = "  const mockData: AuditFeedData = {";
const startIdx = pageContent.indexOf(startStr);
const endIdx = pageContent.indexOf("  };", startIdx) + 4;

const newPageContent = pageContent.substring(0, startIdx) + tsCode + pageContent.substring(endIdx);

fs.writeFileSync('src/widgets/app/audit-feed/page.tsx', newPageContent);
console.log("Injected 50 cases into audit-feed/page.tsx");
