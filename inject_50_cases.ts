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
    timestamp: `2026-07-${day}T12:00:00Z`
  };
});

const tsCode = `  const mockHistoryList: AuditRecord[] = ${JSON.stringify(mockHistoryList, null, 2)};`;

// Read trust-dashboard/page.tsx
const pageContent = fs.readFileSync('src/widgets/app/trust-dashboard/page.tsx', 'utf8');

// Replace mockHistoryList
const startStr = "  const mockHistoryList: AuditRecord[] = [";
const startIdx = pageContent.indexOf(startStr);
const endIdx = pageContent.indexOf("  ];", startIdx) + 4;

const newPageContent = pageContent.substring(0, startIdx) + tsCode + pageContent.substring(endIdx);

fs.writeFileSync('src/widgets/app/trust-dashboard/page.tsx', newPageContent);
console.log("Injected 50 cases into trust-dashboard/page.tsx");
