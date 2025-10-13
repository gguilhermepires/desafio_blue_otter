import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();
    const method = request.method;
    const route = request.route?.path || request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = response.statusCode.toString();

          // Record request count
          this.httpRequestsCounter.inc({
            method,
            route,
            status_code: statusCode,
          });

          // Record request duration
          this.httpRequestDuration.observe(
            {
              method,
              route,
              status_code: statusCode,
            },
            duration,
          );
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = error.status?.toString() || '500';

          // Record request count for errors
          this.httpRequestsCounter.inc({
            method,
            route,
            status_code: statusCode,
          });

          // Record request duration for errors
          this.httpRequestDuration.observe(
            {
              method,
              route,
              status_code: statusCode,
            },
            duration,
          );
        },
      }),
    );
  }
}
