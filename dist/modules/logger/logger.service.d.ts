import { LoggerService as NestLoggerService } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
interface LogContext {
    correlationId?: string;
    requestId?: string;
    [key: string]: any;
}
export declare class LoggerService implements NestLoggerService {
    private readonly prisma;
    private logQueue;
    private isProcessing;
    private readonly BATCH_SIZE;
    private readonly FLUSH_INTERVAL;
    constructor(prisma: PrismaService);
    log(message: string, context?: LogContext): void;
    error(message: string, trace?: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    debug(message: string, context?: LogContext): void;
    verbose(message: string, context?: LogContext): void;
    private addToQueue;
    private flushLogs;
    generateCorrelationId(): string;
    cleanupOldLogs(retentionDays?: number): Promise<number>;
    onModuleDestroy(): Promise<void>;
}
export {};
