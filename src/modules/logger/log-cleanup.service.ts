import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from './logger.service';

@Injectable()
export class LogCleanupService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Run daily at 2 AM to cleanup old logs
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleLogCleanup(): Promise<void> {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30', 10);

    this.logger.log('Starting log cleanup job', {
      retentionDays,
      scheduledTime: new Date().toISOString(),
    });

    try {
      const deletedCount = await this.logger.cleanupOldLogs(retentionDays);

      this.logger.log('Log cleanup job completed successfully', {
        deletedCount,
        retentionDays,
      });
    } catch (error) {
      this.logger.error('Log cleanup job failed', error.stack, {
        retentionDays,
      });
    }
  }
}
