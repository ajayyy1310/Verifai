import { Module } from '@nitrostack/core';
import { AuditTools } from './audit.tools.js';

@Module({
  name: 'verify',
  description: 'Hallucination detection and audit verification',
  controllers: [AuditTools],
})
export class VerifyModule {}
