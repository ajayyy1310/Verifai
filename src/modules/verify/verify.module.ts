import { Module } from '@nitrostack/core';
import { AuditTools, VerifyResources } from './audit.tools.js';
import { VerifyPrompts } from './verify.prompts.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({
  name: 'verify',
  description: 'Hallucination detection and audit verification',
  imports: [SharedModule],
  controllers: [AuditTools, VerifyPrompts, VerifyResources],
})
export class VerifyModule {}
