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
exports.LogCleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const logger_service_1 = require("./logger.service");
let LogCleanupService = class LogCleanupService {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async handleLogCleanup() {
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
        }
        catch (error) {
            this.logger.error('Log cleanup job failed', error.stack, {
                retentionDays,
            });
        }
    }
};
exports.LogCleanupService = LogCleanupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LogCleanupService.prototype, "handleLogCleanup", null);
exports.LogCleanupService = LogCleanupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], LogCleanupService);
//# sourceMappingURL=log-cleanup.service.js.map