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
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("../../modules/logger/logger.service");
const library_1 = require("@prisma/client/runtime/library");
let AllExceptionsFilter = class AllExceptionsFilter {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errorDetails = null;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' &&
                exceptionResponse !== null) {
                message = exceptionResponse.message || exception.message;
                errorDetails = exceptionResponse;
            }
        }
        else if (exception instanceof library_1.PrismaClientKnownRequestError) {
            status = common_1.HttpStatus.BAD_REQUEST;
            switch (exception.code) {
                case 'P2002':
                    message = 'Unique constraint violation';
                    errorDetails = { field: exception.meta?.target };
                    break;
                case 'P2025':
                    message = 'Record not found';
                    break;
                case 'P2003':
                    message = 'Foreign key constraint violation';
                    break;
                default:
                    message = 'Database operation failed';
            }
        }
        else if (exception instanceof library_1.PrismaClientValidationError) {
            status = common_1.HttpStatus.BAD_REQUEST;
            message = 'Invalid data provided';
        }
        else if (exception instanceof Error) {
            message = exception.message || 'Internal server error';
        }
        const correlationId = request.correlationId || 'unknown';
        this.logger.error(message, exception instanceof Error ? exception.stack : undefined, {
            correlationId,
            requestId: correlationId,
            endpoint: request.url,
            method: request.method,
            statusCode: status,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
        });
        const errorResponse = {
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId,
            ...(process.env.NODE_ENV === 'development' && errorDetails
                ? { details: errorDetails }
                : {}),
        };
        response.status(status).json(errorResponse);
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map