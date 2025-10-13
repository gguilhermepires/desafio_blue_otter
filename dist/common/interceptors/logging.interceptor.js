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
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const logger_service_1 = require("../../modules/logger/logger.service");
let LoggingInterceptor = class LoggingInterceptor {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const correlationId = this.logger.generateCorrelationId();
        request.correlationId = correlationId;
        const { method, url, body, query, params } = request;
        const userAgent = request.headers['user-agent'] || 'unknown';
        const ip = request.ip;
        const startTime = Date.now();
        this.logger.log('Incoming request', {
            correlationId,
            requestId: correlationId,
            method,
            url,
            userAgent,
            ip,
            timestamp: new Date().toISOString(),
            ...(Object.keys(body || {}).length > 0 && { body }),
            ...(Object.keys(query || {}).length > 0 && { query }),
            ...(Object.keys(params || {}).length > 0 && { params }),
        });
        return next.handle().pipe((0, operators_1.tap)({
            next: (data) => {
                const responseTime = Date.now() - startTime;
                const statusCode = response.statusCode;
                this.logger.log('Outgoing response', {
                    correlationId,
                    requestId: correlationId,
                    method,
                    url,
                    statusCode,
                    responseTime: `${responseTime}ms`,
                    timestamp: new Date().toISOString(),
                });
            },
            error: (error) => {
                const responseTime = Date.now() - startTime;
                const statusCode = response.statusCode || 500;
                this.logger.error('Request failed', error.stack, {
                    correlationId,
                    requestId: correlationId,
                    method,
                    url,
                    statusCode,
                    responseTime: `${responseTime}ms`,
                    timestamp: new Date().toISOString(),
                    errorMessage: error.message,
                });
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map