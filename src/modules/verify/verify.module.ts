import { Module } from '@nitrostack/core';
import { AuditTools, VerifyResources } from './audit.tools.js';
import { VerifyPrompts } from './verify.prompts.js';

@Module({
  name: 'verify',
  description: 'Hallucination detection and audit verification',
  controllers: [AuditTools, VerifyPrompts, VerifyResources],
})
export class VerifyModule {}
