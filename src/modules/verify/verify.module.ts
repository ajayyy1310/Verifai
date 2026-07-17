import { Module } from '@nitrostack/core';
import { AuditTools } from './audit.tools.js';
import { VerifyPrompts } from './verify.prompts.js';

@Module({
  name: 'verify',
  description: 'Hallucination detection and audit verification',
  controllers: [AuditTools, VerifyPrompts],
})
export class VerifyModule {}
