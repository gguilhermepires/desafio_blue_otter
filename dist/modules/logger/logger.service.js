"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
let LoggerService = class LoggerService {
    prisma;
    logQueue = [];
    isProcessing = false;
    BATCH_SIZE = 10;
    FLUSH_INTERVAL = 5000;
    constructor(prisma) {
        this.prisma = prisma;
        setInterval(() => this.flushLogs(), this.FLUSH_INTERVAL);
    }
    log(message, context) {
        this.addToQueue(client_1.LogLevel.INFO, message, context);
        console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
    }
    error(message, trace, context) {
        this.addToQueue(client_1.LogLevel.ERROR, message, context, trace);
        console.error(`[ERROR] ${message}`, trace || '', context ? JSON.stringify(context) : '');
    }
    warn(message, context) {
        this.addToQueue(client_1.LogLevel.WARN, message, context);
        console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
    }
    debug(message, context) {
        this.addToQueue(client_1.LogLevel.DEBUG, message, context);
        if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
            console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '');
        }
    }
    verbose(message, context) {
        this.debug(message, context);
    }
    addToQueue(level, message, context, stackTrace) {
        this.logQueue.push({
            level,
            message,
            context,
            stackTrace,
        });
        if (this.logQueue.length >= this.BATCH_SIZE) {
            this.flushLogs();
        }
    }
    async flushLogs() {
        if (this.isProcessing || this.logQueue.length === 0) {
            return;
        }
        this.isProcessing = true;
        const logsToProcess = this.logQueue.splice(0, this.BATCH_SIZE);
        try {
            await this.prisma.log.createMany({
                data: logsToProcess.map((log) => ({
                    id: (0, crypto_1.randomUUID)(),
                    level: log.level,
                    message: log.message,
                    context: log.context ? log.context : undefined,
                    stackTrace: log.stackTrace || undefined,
                    metadata: {
                        nodeVersion: process.version,
                        environment: process.env.NODE_ENV || 'development',
                    },
                })),
            });
        }
        catch (error) {
            console.error('Failed to write logs to database:', error);
            console.error('Lost logs:', logsToProcess);
        }
        finally {
            this.isProcessing = false;
        }
    }
    generateCorrelationId() {
        return (0, crypto_1.randomUUID)();
    }
    async cleanupOldLogs(retentionDays = 30) {
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
        }
        catch (error) {
            this.error('Failed to cleanup old logs', error.stack, {
                retentionDays,
                cutoffDate: cutoffDate.toISOString(),
            });
            throw error;
        }
    }
    async onModuleDestroy() {
        await this.flushLogs();
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LoggerService);
//# sourceMappingURL=logger.service.js.map