import { PromptDecorator as Prompt, ControllerDecorator as Controller, ExecutionContext } from '@nitrostack/core';
import { computeTrustScore } from './verifier.js';

@Controller('verify')
export class VerifyPrompts {
  @Prompt({
    name: 'audit_report',
    description: 'Generates a detailed factual correction report based on Verifai verifier audits',
    arguments: [
      {
        name: 'agentOutput',
        description: 'The AI agent response to verify',
        required: false
      },
      {
        name: 'sources',
        description: 'The source documents/context to verify against',
        required: false
      }
    ]
  })
  async getAuditReport(args: { agentOutput?: string; sources?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating audit report prompt for LLM');

    if (!args.agentOutput?.trim() || !args.sources?.trim()) {
      return [
        {
          role: 'system' as const,
          content: `You are Verifai, an AI factual auditor and hallucination correction engine.
The prompt was invoked with missing or empty inputs:
- agentOutput: ${args.agentOutput ? `"${args.agentOutput}"` : 'undefined'}
- sources: ${args.sources ? `"${args.sources}"` : 'undefined'}

Your task is to politely ask the user to specify both:
1. The actual statement to verify (agentOutput).
2. The reference material to verify against (sources).

Explain that both parameters are required to perform a valid audit and generate a trust score. Do not attempt to run the audit or display scores until they are provided.`
        },
        {
          role: 'user' as const,
          content: 'Please help me run a factual alignment audit.'
        }
      ];
    }

    // Split sources by newline to form a sources array
    const sourcesArray = args.sources
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const { score, verdict, mismatches, claimDetails } = computeTrustScore(args.agentOutput, sourcesArray);

    const findingsSummary = `
--- VERIFAI FACTUAL ALIGNMENT AUDIT FINDINGS ---
Trust Score: ${(score * 100).toFixed(0)}%
Verdict: ${verdict}
Total Claims Extracted: ${claimDetails.length}
Factual Mismatches Detected: ${mismatches.length}

${mismatches.length > 0 ? 'Mismatches List:\n' + mismatches.map((m, idx) => `[Mismatch #${idx + 1}]
Claim: "${m.claim}"
Source Context: "${m.sourceText}"
Issue: ${m.issue}`).join('\n\n') : 'No mismatches detected.'}

Claims Analysis Breakdown:
${claimDetails.map((c, idx) => `[Claim #${idx + 1}]
Text: "${c.claim}"
Status: ${c.supported ? 'SUPPORTED' : 'UNSUPPORTED'} (Entity Overlap: ${(c.entityRatio * 100).toFixed(0)}%)`).join('\n\n')}
------------------------------------------------
`;

    return [
      {
        role: 'system' as const,
        content: `You are Verifai, an AI factual auditor and hallucination correction engine. Your task is to write a comprehensive factual correction report for the user based on the provided verifier audit findings.

Audit Guidelines:
1. Explain clearly why any unsupported claims are invalid.
2. Direct the user to the correct facts present in the source documents.
3. Be objective, concise, and constructive. If the trust score is 100%, congratulate the user and confirm the statement matches the sources perfectly.
`
      },
      {
        role: 'user' as const,
        content: `Please review the following statements against the source context:

Agent Statement:
"${args.agentOutput}"

Source Documents:
"${args.sources}"

Verification Findings:
${findingsSummary}

Please write a clear, detailed factual correction report based on these findings.`
      }
    ];
  }
}
