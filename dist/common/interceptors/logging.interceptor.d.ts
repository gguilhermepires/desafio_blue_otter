import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LoggerService } from '../../modules/logger/logger.service';
export declare class LoggingInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: LoggerService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
