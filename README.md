# Verifai

**AI Hallucination Detection & Trust Scoring MCP Server**

Verifai is a Model Context Protocol (MCP) server that detects and scores AI-generated hallucinations by comparing agent outputs against verified sources. It provides deterministic trust scoring, detailed mismatch analysis, and audit trail tracking.

## Features

- **Hallucination Detection** — Compare AI agent outputs against source material
- **Trust Scoring** — Deterministic 0.0–1.0 trust scores with PASS/BLOCK verdicts
- **Audit Logging** — Track all audits with timestamps, verdicts, and detailed mismatches
- **Trust Dashboard** — Aggregate statistics: pass rate, average score, trend analysis
- **Source Citation** — Detailed factual issue reports with source references

## Architecture

### Modules

- **`verify`** — Core hallucination detection
  - `audit_response` — Score agent output against sources
  - `explain_audit` — Detailed mismatch analysis with citations
  
- **`history`** — Audit tracking & analytics
  - `get_audit_log` — Retrieve audits by date range with claims analysis
  - `get_trust_summary` — Aggregate trust metrics & trends
  
- **`calculator`** — Scoring logic helper

### Tools

| Tool | Input | Output |
|------|-------|--------|
| `audit_response` | `agentOutput`, `sources[]` | `trustScore`, `verdict`, `mismatches[]` |
| `explain_audit` | `auditId` | Detailed factual issues with source citations |
| `get_audit_log` | `startDate?`, `endDate?` | Audit cards array with claims, Jaccard similarity, entity overlap |
| `get_trust_summary` | — | `totalAudits`, `passCount`, `passRate`, `avgScore`, `trend` |

### Widgets

- **`audit-feed`** — Renders audit log cards with verdicts, timestamps, and trust scores
- **`trust-dashboard`** — Displays aggregate statistics, gauge visualization, and trend sparkline

## Quick Start

```bash
npm install
npm run dev
```

The MCP server will start and register all tools, resources, and widgets with NitroStack Studio.

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Build and start
npm run start:prod   # Start production build
npm run upgrade      # Upgrade NitroStack CLI
npm run install:all  # Install all dependencies
npm run widget       # Manage widget dependencies
```

## Project Structure

```
src/
├── app.module.ts           # Root module (registers verify, history, calculator)
├── index.ts                # MCP server entry point
├── modules/
│   ├── verify/             # Hallucination detection
│   │   ├── verify.module.ts
│   │   └── audit.tools.ts
│   ├── history/            # Audit tracking
│   │   ├── history.module.ts
│   │   └── history.tools.ts
│   └── calculator/         # Scoring logic
│       ├── calculator.module.ts
│       ├── calculator.tools.ts
│       ├── calculator.resources.ts
│       └── calculator.prompts.ts
├── health/
│   └── system.health.ts    # System health check
└── widgets/
    └── app/
        ├── audit-feed/     # Audit log widget
        └── trust-dashboard/ # Statistics widget

fixtures/
└── audits.json             # Sample audit data (12 audits, 75% pass rate)
```

## Fixture Data

The project includes 12 sample audits with rich claims analysis:
- **9 PASS verdicts** (75%) — Accurate agent outputs with high Jaccard similarity (0.82–0.93)
- **3 BLOCK verdicts** (25%) — Hallucinations with detailed mismatches and low similarity (0.35–0.42)
  - Water boiling point error (50°C vs 100°C)
  - Oxygen percentage overestimation (50% vs 21%)
  - Amazon oxygen production hallucination (80% vs 20%)

Each audit includes:
- `claims[]` — Array of claim-to-source mappings
- `jaccard` — Jaccard similarity coefficient (0.0–1.0)
- `entityOverlap` — Entity overlap ratio (0.0–1.0)
- `score` — Claim-level trust score
- `status` — 'supported', 'contradicted', or 'unsupported'

## Testing

Use NitroStack Studio to test tools and widgets:

1. **Audit Response** — `audit_response` tool with sample agent output and sources
2. **Explain Audit** — `explain_audit` tool with audit ID (e.g., `audit_003`)
3. **Audit Feed** — `get_audit_log` tool renders `audit-feed` widget with date range
4. **Trust Dashboard** — `get_trust_summary` tool renders `trust-dashboard` widget

## Development

### Adding New Audits

Edit `src/modules/history/history.tools.ts` to add new audit records with claims analysis.

### Extending Scoring Logic

Modify `src/modules/verify/audit.tools.ts` to adjust trust score calculation and mismatch detection.

### Creating New Widgets

Use the existing `audit-feed` and `trust-dashboard` widgets as templates under `src/widgets/app/`.

## Implementation Notes

### No Console Logging in Server Code
The MCP server communicates via JSON-RPC over STDIO. Any `console.log()`, `console.error()`, or similar calls in server files (`src/**/*.ts` excluding widgets) will corrupt the protocol stream. Use `ctx.logger.info()` / `ctx.logger.error()` inside tool/resource/prompt handlers instead.

### Relative Imports Must End in `.js`
This project uses NodeNext ESM. All relative imports must include the `.js` extension:
```typescript
import { HistoryTools } from './history.tools.js';
import { CalculatorModule } from './calculator/calculator.module.js';
```

### Injectable Decorator for Service Injection
When a tool/resource class injects services via constructor, use `@Injectable({ deps: [...] })`:
```typescript
import { Injectable } from '@nitrostack/core';

@Injectable({ deps: [ConfigService] })
export class MyTools {
  constructor(private config: ConfigService) {}
}
```

## Links

- **NitroStack Docs** — <https://docs.nitrostack.ai>
- **MCP Specification** — <https://modelcontextprotocol.io>
- **NitroStack Studio** — <https://nitrostack.ai/studio>

## Community

- Discord: <https://discord.gg/uVWey6UhuD>
- X: <https://x.com/nitrostackai>
- YouTube: <https://www.youtube.com/@nitrostackai>
- LinkedIn: <https://linkedin.com/company/nitrostack-ai/>
- GitHub: <https://github.com/nitrostackai>

## License

MIT
