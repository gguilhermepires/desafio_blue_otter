import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { LoggerService } from '../../modules/logger/logger.service';
import { Prisma } from '@prisma/client';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let loggerService: LoggerService;

  const mockLoggerService = {
    error: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const mockRequest = {
    url: '/api/test',
    method: 'GET',
    headers: {
      'user-agent': 'test-agent',
    },
    ip: '127.0.0.1',
  };

  const mockHost: ArgumentsHost = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    loggerService = module.get<LoggerService>(LoggerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: expect.any(String),
          path: '/api/test',
          message: 'Test error',
          correlationId: 'unknown',
        }),
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Test error',
        expect.any(String),
        expect.objectContaining({
          endpoint: '/api/test',
          method: 'GET',
          correlationId: 'unknown',
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Validation failed', errors: ['Field required'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: expect.any(String),
          path: '/api/test',
          message: 'Validation failed',
          correlationId: 'unknown',
        }),
      );
    });

    it('should handle Prisma NotFoundError', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: expect.any(String),
          path: '/api/test',
          message: 'Record not found',
          correlationId: 'unknown',
        }),
      );
    });

    it('should handle Prisma UniqueConstraintError', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: expect.any(String),
          path: '/api/test',
          message: 'Unique constraint violation',
          correlationId: 'unknown',
        }),
      );
    });

    it('should handle Prisma ForeignKeyError', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: expect.any(String),
          path: '/api/test',
          message: 'Foreign key constraint violation',
          correlationId: 'unknown',
        }),
      );
    });

    it('should handle generic Error', () => {
      const exception = new Error('Unexpected error');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: expect.any(String),
          path: '/api/test',
          message: 'Unexpected error',
          correlationId: 'unknown',
        }),
      );
    });

    it('should handle unknown exception types', () => {
      const exception = 'String error';

      filter.catch(exception as any, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: expect.any(String),
          path: '/api/test',
          message: 'Internal server error',
          correlationId: 'unknown',
        }),
      );
    });
  });
});
