import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generate correlation ID for this request
    const correlationId = this.logger.generateCorrelationId();
    (request as any).correlationId = correlationId;

    // Log incoming request
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

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          // Log outgoing response
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
        error: (error: Error) => {
          // Log error response
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
      }),
    );
  }
}
