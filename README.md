# Verifai

> 🏷️ **Track: Enterprise AI & Workplace Automation**

**AI Hallucination Detection & Trust Scoring MCP Server**

Verifai is a Model Context Protocol (MCP) server designed to detect, analyze, and score AI-generated hallucinations. By comparing agent statements against verified reference sources, Verifai computes deterministic trust scores, flags factual contradictions, and provides structured correction reports with citations.

---

## 🚨 The Problem

AI agents are being deployed at scale across enterprise workflows — drafting reports, answering policy questions, summarising financial data, and advising customers. But **AI models hallucinate**. They fabricate numbers, swap currencies, misattribute names, and confidently state things that directly contradict the source material they were given.

In a workplace context, this is dangerous:

- An AI agent tells a customer the return window is **60 days** — the policy says **30**.
- A finance assistant states Q3 revenue was **$18 million** — the report says **$15 million**.
- An HR bot says the company **hired** 200 engineers — the source says they were **laid off**.
- A product assistant claims the laptop has **16 hours** of battery life — the spec sheet says **10**.

There is no existing lightweight, deterministic layer that sits between an AI agent and its output to catch these mistakes **before they reach the user** — without requiring another expensive LLM call to verify.

---

## ✅ Our Solution

**Verifai** is a real-time hallucination firewall exposed as an MCP server. It intercepts AI agent outputs, breaks them into fine-grained claims, and verifies each claim against authoritative source documents using a fully **deterministic, rule-based engine** — no LLMs, no guesswork.

### How it works

1. **Claim Extraction** — The agent's response is split into atomic, verifiable claims by parsing sentence boundaries, conjunctions, and clause separators.
2. **Text Normalization** — Claims and sources are normalised (abbreviations, month names, number words, currency symbols) so comparisons are always apples-to-apples.
3. **Factual Alignment** — Each claim is checked against source documents for entity overlap, exact number matching, semantic contradictions (e.g. *grew* vs *declined*), currency/unit swaps (e.g. *$1000* vs *€1000*), and proper noun hallucinations.
4. **Trust Scoring** — A deterministic `0.0–1.0` trust score is computed from the ratio of supported claims. Scores map to three verdicts:
   - ✅ `PASS` — Output is factually aligned with sources.
   - ⚠️ `FLAG` — Partial alignment; downstream consumer should review.
   - 🚫 `BLOCK` — Significant factual contradiction; output should not be delivered.
5. **Audit Trail** — Every verification is logged with claim-level breakdowns, Jaccard similarity, entity overlap metrics, and source citations — creating a full accountability record.
6. **Visual Dashboard** — Built-in MCP widgets surface live trust scores, verdict trends, and audit history directly inside compatible AI clients.

> Verifai adds a trust layer to any AI agent workflow **without modifying the agent itself** — just plug in the MCP server and every agent response is automatically audited.



## Features

- **Factual Hallucination Auditing** — Compares AI agent outputs against authoritative source material.
- **Deterministic Trust Scoring** — Generates precise `0.0–1.0` (mapped to `0%–100%`) trust scores with `PASS`, `FLAG`, or `BLOCK` verdicts.
- **Context-Aware Verification Engine** — Splits statements into fine-grained claims, enforces context-aware number matching, and resolves unit/currency differences.
- **Source Conflict Detection** — Alerts downstream consumers if reference documents contain contradictory statistics.
- **Audit Logging & Analytics** — Stores and manages audit history with claim-level breakdowns, Jaccard similarities, and entity overlap metrics.
- **Visual Analytics Dashboard** — Includes built-in widgets for real-time visualization of trust statistics, gauges, and historical trends.

---

## Architecture

```
src/
├── index.ts                 # MCP Server entrypoint (STDIO transport)
├── app.module.ts            # Root NitroStack module
├── shared/
│   └── types.ts             # Common interfaces (AuditRecord, Claim, Mismatch)
├── health/
│   └── system.health.ts     # Resource health monitoring (Memory, CPU, Disk)
└── modules/
    ├── shared/
    │   ├── shared.module.ts
    │   └── audit-store.service.ts # JSON-file database persistence (fixtures/live_audits.json)
    ├── verify/              # Hallucination Verification Engine
    │   ├── verify.module.ts
    │   ├── audit.tools.ts   # Tool handlers (audit_response, explain_audit) & resources
    │   ├── verify.prompts.ts # Prompt template (audit_report)
    │   ├── verifier.ts      # Core verification, extraction, and comparison logic
    │   └── verifier.test.ts # Verifier test suite
    └── history/             # Logs & Dashboard Metrics
        ├── history.module.ts
        └── history.tools.ts # Tool handlers (get_audit_log, get_trust_summary)
```

---

## Technical Specifications

### 1. Factual Verification Engine (`verifier.ts`)
The verifier performs several key stages to check factual alignment without relying on expensive LLM calls:
* **Text Normalization**: Standardizes whitespace, collapses acronym periods (e.g., `U.S.` to `US`), resolves month names (e.g., `Dec` to `December`), maps written numbers to digits (e.g., `fifty` to `50`), and translates mathematical symbols (`=`, `&`, `+`).
* **Claim Splitting**: Extracts fine-grained claims from agent outputs by splitting on sentence boundaries, colons, semicolons, and independent clause conjunctions (`but`, `however`, `and` followed by a subject-verb sequence).
* **Context-Aware Number Validation**: Extracts and compares numbers strictly (no tolerance for mismatches). Preserves sentence-level source contexts to prevent false positives when matching numbers across multiple items.
* **Semantic Analysis**:
  * **Semantic Contradictions**: Detects opposite movements using predefined antonym sets (e.g., `grew` vs `declined`, `buy` vs `sell`).
  * **Unit & Currency Swaps**: Detects unit/currency mismatches (e.g., `$1000` vs `1000 Euros` or `50 km` as `50 miles`).
  * **Proper Noun Mismatches**: Validates proper nouns in claims against normalized source references to catch fabricated names and places.
  * **Pronoun Alignment**: Flags mismatches in gendered pronouns (`he`/`she`) between claims and reference contexts.

### 2. Exposed MCP Tools

| Tool Name | Description | Inputs | Key Outputs |
|:---|:---|:---|:---|
| [`audit_response`](file:///c:/Users/RAJNANDHNI/nitroprojects/Verifai/src/modules/verify/audit.tools.ts#L91) | Performs a factual alignment audit on a statement. | `agentOutput: string`, `sources: string[]` | `auditId`, `trustScore`, `verdict`, `mismatches[]` |
| [`explain_audit`](file:///c:/Users/RAJNANDHNI/nitroprojects/Verifai/src/modules/verify/audit.tools.ts#L293) | Returns detailed factual mismatches and source citations for an audit. | `auditId: string` | Detailed mismatch array and claim metrics |
| [`get_audit_log`](file:///c:/Users/RAJNANDHNI/nitroprojects/Verifai/src/modules/history/history.tools.ts#L23) | Retrieves historical audit logs within a date range. | `startDate: string`, `endDate: string` | Audits array with Jaccard and entity overlap metrics |
| [`get_trust_summary`](file:///c:/Users/RAJNANDHNI/nitroprojects/Verifai/src/modules/history/history.tools.ts#L79) | Computes aggregate trust stats & daily trend metrics. | — | Pass rate, average score, min/max score, trends |

### 3. Exposed MCP Resources
* `resource://return_policy_official_document` — Returns the official return guidelines (30 days limit).
* `resource://product_specs_datasheet` — Detailed specifications for Model X (16GB RAM, 512GB SSD).
* `resource://user_manual_draft` — Draft manual for Model X battery life (up to 10 hours).
* `resource://source_report_a` — Financial performance report Q3 (revenue of $15 million).
* `resource://source_report_b` — Financial performance report Q3 (12% margin, $1.8 million profit).

---

## Exposed MCP Widgets

NitroStack visual widgets are built with React and tailwind to render directly in compatible MCP clients:

1. **`audit-feed`** (linked to `get_audit_log`)
   - Displays scrollable lists of past audits.
   - Highlights trust scores, verdicts (`PASS`, `FLAG`, `BLOCK`), claim-level statuses, and visual cards.
2. **`trust-dashboard`** (linked to `get_trust_summary`)
   - Renders a score gauge, pass/block counts, average trust score, and historical trend sparklines.

---

## Recent Improvements

- **Sentence-Level Context Preservation**: Updated source document parsing to evaluate context on sentence boundaries rather than token/conjunction boundaries. This preserves surrounding context for labels and values (e.g. `Net profit: 155.33`), preventing false-positive number mismatches.
- **Robust Parameter Normalization**: Made inputs in `audit_response` fully resilient. Resolves cases of empty or missing statement arguments gracefully inside the tool handler, returning a structured `BLOCK` verdict with help dialogs instead of breaking Zod validation.
- **Proper Noun Abbreviation Alignment**: Enhanced proper noun validation to normalize source text abbreviations (e.g., matching `Dec` to `December` and `Dr.` to `Doctor`), preventing false mismatch flags.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
# Install package dependencies
npm run install:all

# Compile the TypeScript files
npm run build
```

### Running the Server
```bash
# Start the production server
npm start
```

### Running Tests
```bash
# Run verifier unit tests
node dist/modules/verify/verifier.test.js

# Run the 50 case verification suite
npx tsx test_50_cases.ts

# Run the 100 case edge case suite
npx tsx test_100_cases.ts
```

---

## Links

- **NitroStack Official Documentation**: <https://docs.nitrostack.ai>
- **Model Context Protocol Specification**: <https://modelcontextprotocol.io>
