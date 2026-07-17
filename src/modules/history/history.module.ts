import { Module } from '@nitrostack/core';
import { HistoryTools } from './history.tools.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({
  name: 'history',
  description: 'Audit history and trust statistics',
  imports: [SharedModule],
  controllers: [HistoryTools],
})
export class HistoryModule {}
