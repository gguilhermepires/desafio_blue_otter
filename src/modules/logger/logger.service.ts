import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogLevel } from '@prisma/client';
import { randomUUID } from 'crypto';

interface LogContext {
  correlationId?: string;
  requestId?: string;
  [key: string]: any;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private logQueue: Array<{
    level: LogLevel;
    message: string;
    context?: LogContext;
    stackTrace?: string;
  }> = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor(private readonly prisma: PrismaService) {
    // Start periodic flush
    setInterval(() => this.flushLogs(), this.FLUSH_INTERVAL);
  }

  /**
   * Log an informational message
   */
  log(message: string, context?: LogContext): void {
    this.addToQueue(LogLevel.INFO, message, context);
    // Also log to console for immediate visibility
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
  }

  /**
   * Log an error message with optional stack trace
   */
  error(message: string, trace?: string, context?: LogContext): void {
    this.addToQueue(LogLevel.ERROR, message, context, trace);
    // Also log to console for immediate visibility
    console.error(
      `[ERROR] ${message}`,
      trace || '',
      context ? JSON.stringify(context) : '',
    );
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.addToQueue(LogLevel.WARN, message, context);
    // Also log to console for immediate visibility
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.addToQueue(LogLevel.DEBUG, message, context);
    // Only log debug in development
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.LOG_LEVEL === 'debug'
    ) {
      console.debug(
        `[DEBUG] ${message}`,
        context ? JSON.stringify(context) : '',
      );
    }
  }

  /**
   * Log verbose message (same as debug for our purposes)
   */
  verbose(message: string, context?: LogContext): void {
    this.debug(message, context);
  }

  /**
   * Add log entry to queue for async processing
   */
  private addToQueue(
    level: LogLevel,
    message: string,
    context?: LogContext,
    stackTrace?: string,
  ): void {
    this.logQueue.push({
      level,
      message,
      context,
      stackTrace,
    });

    // If queue is full, flush immediately
    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.flushLogs();
    }
  }

  /**
   * Flush logs from queue to database asynchronously
   */
  private async flushLogs(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const logsToProcess = this.logQueue.splice(0, this.BATCH_SIZE);

    try {
      // Batch insert logs to database
      await this.prisma.log.createMany({
        data: logsToProcess.map((log) => ({
          id: randomUUID(),
          level: log.level,
          message: log.message,
          context: log.context ? (log.context as any) : undefined,
          stackTrace: log.stackTrace || undefined,
          metadata: {
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
          },
        })),
      });
    } catch (error) {
      // If database write fails, log to console as fallback
      console.error('Failed to write logs to database:', error);
      console.error('Lost logs:', logsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate a correlation ID for request tracking
   */
  generateCorrelationId(): string {
    return randomUUID();
  }

  /**
   * Clean up old logs based on retention period
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.prisma.log.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      this.log(`Cleaned up ${result.count} old logs`, {
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
      });

      return result.count;
    } catch (error) {
      this.error('Failed to cleanup old logs', error.stack, {
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
      });
      throw error;
    }
  }

  /**
   * Ensure all pending logs are flushed (useful for shutdown)
   */
  async onModuleDestroy(): Promise<void> {
    await this.flushLogs();
  }
}
