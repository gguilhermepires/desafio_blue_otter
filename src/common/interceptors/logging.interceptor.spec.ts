import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from './logging.interceptor';
import { LoggerService } from '../../modules/logger/logger.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggerService: LoggerService;

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    generateCorrelationId: jest.fn().mockReturnValue('test-correlation-id'),
  };

  const mockRequest = {
    method: 'GET',
    url: '/api/test',
    headers: {},
    ip: '127.0.0.1',
    body: { test: 'data' },
  };

  const mockResponse = {
    statusCode: 200,
  };

  const mockExecutionContext: ExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    loggerService = module.get<LoggerService>(LoggerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should log incoming request and response', (done) => {
      const mockCallHandler: CallHandler = {
        handle: () => of({ result: 'success' }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ result: 'success' });
        },
        complete: () => {
          expect(mockLoggerService.log).toHaveBeenCalledWith(
            'Incoming request',
            expect.objectContaining({
              method: 'GET',
              url: '/api/test',
              correlationId: 'test-correlation-id',
            }),
          );

          expect(mockLoggerService.log).toHaveBeenCalledWith(
            'Outgoing response',
            expect.objectContaining({
              method: 'GET',
              url: '/api/test',
              statusCode: 200,
              responseTime: expect.any(String),
            }),
          );

          done();
        },
      });
    });

    it('should use generated correlation ID', (done) => {
      const mockCallHandler: CallHandler = {
        handle: () => of({ result: 'success' }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLoggerService.generateCorrelationId).toHaveBeenCalled();
          expect(mockLoggerService.log).toHaveBeenCalledWith(
            'Incoming request',
            expect.objectContaining({
              correlationId: 'test-correlation-id',
            }),
          );
          done();
        },
      });
    });

    it('should log error when request fails', (done) => {
      const error = new Error('Test error');
      const mockCallHandler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(mockLoggerService.error).toHaveBeenCalledWith(
            'Request failed',
            error.stack,
            expect.objectContaining({
              method: 'GET',
              url: '/api/test',
              errorMessage: 'Test error',
            }),
          );
          done();
        },
      });
    });

    it('should measure response time', (done) => {
      const mockCallHandler: CallHandler = {
        handle: () => of({ result: 'success' }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const responseLog = mockLoggerService.log.mock.calls.find(
            (call) => call[0] === 'Outgoing response',
          );
          expect(responseLog).toBeDefined();
          expect(typeof responseLog[1].responseTime).toBe('string');
          done();
        },
      });
    });

    it('should handle requests without body', (done) => {
      const requestWithoutBody = {
        ...mockRequest,
        body: undefined,
      };

      const contextWithoutBody: ExecutionContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => requestWithoutBody,
          getResponse: () => mockResponse,
        }),
      };

      const mockCallHandler: CallHandler = {
        handle: () => of({ result: 'success' }),
      };

      interceptor.intercept(contextWithoutBody, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLoggerService.log).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
