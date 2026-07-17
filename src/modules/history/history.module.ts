import { Module } from '@nitrostack/core';
import { HistoryTools } from './history.tools.js';

@Module({
  name: 'history',
  description: 'Audit history and trust statistics',
  controllers: [HistoryTools],
})
export class HistoryModule {}
