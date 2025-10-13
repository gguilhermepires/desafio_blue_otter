import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = null;

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = (exceptionResponse as any).message || exception.message;
        errorDetails = exceptionResponse;
      }
    }
    // Handle Prisma known request errors
    else if (exception instanceof PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;

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
    // Handle Prisma validation errors
    else if (exception instanceof PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
    }
    // Handle generic errors
    else if (exception instanceof Error) {
      message = exception.message || 'Internal server error';
    }

    // Log error asynchronously (non-blocking)
    const correlationId = (request as any).correlationId || 'unknown';
    this.logger.error(
      message,
      exception instanceof Error ? exception.stack : undefined,
      {
        correlationId,
        requestId: correlationId,
        endpoint: request.url,
        method: request.method,
        statusCode: status,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
    );

    // Build structured error response
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
}
