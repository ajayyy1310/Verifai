import { Module } from '@nitrostack/core';
import { AuditStoreService } from './audit-store.service.js';

@Module({
  name: 'shared',
  description: 'Shared services and utilities module',
  providers: [AuditStoreService],
  exports: [AuditStoreService],
})
export class SharedModule {}
