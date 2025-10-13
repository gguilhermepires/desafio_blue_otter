import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { LogLevel } from '@prisma/client';

describe('LoggerService', () => {
  let service: LoggerService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    log: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should add INFO log to queue', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test message', '');
      expect(service['logQueue']).toHaveLength(1);
      expect(service['logQueue'][0]).toMatchObject({
        level: LogLevel.INFO,
        message: 'Test message',
      });

      consoleSpy.mockRestore();
    });

    it('should add INFO log with context', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const context = { requestId: '123', userId: 456 };

      service.log('Test message', context);

      expect(service['logQueue'][0]).toMatchObject({
        level: LogLevel.INFO,
        message: 'Test message',
        context,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('error', () => {
    it('should add ERROR log to queue', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.error('Error message');

      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Error message', '', '');
      expect(service['logQueue']).toHaveLength(1);
      expect(service['logQueue'][0]).toMatchObject({
        level: LogLevel.ERROR,
        message: 'Error message',
      });

      consoleSpy.mockRestore();
    });

    it('should add ERROR log with stack trace', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const stackTrace = 'Error: Something went wrong\n  at Test.function';

      service.error('Error message', stackTrace);

      expect(service['logQueue'][0]).toMatchObject({
        level: LogLevel.ERROR,
        message: 'Error message',
        stackTrace,
      });

      consoleSpy.mockRestore();
    });

    it('should add ERROR log with context and stack trace', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const context = { endpoint: '/api/test', method: 'POST' };
      const stackTrace = 'Error stack trace';

      service.error('Error message', stackTrace, context);

      expect(service['logQueue'][0]).toMatchObject({
        level: LogLevel.ERROR,
        message: 'Error message',
        context,
        stackTrace,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('warn', () => {
    it('should add WARN log to queue', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.warn('Warning message');

      expect(consoleSpy).toHaveBeenCalledWith('[WARN] Warning message', '');
      expect(service['logQueue']).toHaveLength(1);
      expect(service['logQueue'][0]).toMatchObject({
        level: LogLevel.WARN,
        message: 'Warning message',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('debug', () => {
    it('should add DEBUG log to queue', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      service.debug('Debug message');

      expect(service['logQueue']).toHaveLength(1);
      expect(service['logQueue'][0]).toMatchObject({
        level: LogLevel.DEBUG,
        message: 'Debug message',
      });

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should not log to console in production', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      const originalEnv = process.env.NODE_ENV;
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;

      service.debug('Debug message');

      expect(consoleSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
      process.env.LOG_LEVEL = originalLogLevel;
      consoleSpy.mockRestore();
    });

    it('should log to console when LOG_LEVEL is debug', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';

      service.debug('Debug message');

      expect(consoleSpy).toHaveBeenCalled();

      process.env.LOG_LEVEL = originalLogLevel;
      consoleSpy.mockRestore();
    });
  });

  describe('verbose', () => {
    it('should call debug method', () => {
      const debugSpy = jest.spyOn(service, 'debug').mockImplementation();

      service.verbose('Verbose message', { test: true });

      expect(debugSpy).toHaveBeenCalledWith('Verbose message', { test: true });

      debugSpy.mockRestore();
    });
  });

  describe('flushLogs', () => {
    it('should flush logs to database when batch size reached', async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockPrismaService.log.createMany.mockResolvedValue({ count: 10 });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Add logs to trigger flush at batch size
      for (let i = 0; i < 10; i++) {
        service.log(`Message ${i}`);
      }

      // Wait a bit for async flush to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockPrismaService.log.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            level: LogLevel.INFO,
            message: expect.stringContaining('Message'),
            metadata: {
              nodeVersion: process.version,
              environment: expect.any(String),
            },
          }),
        ]),
      });

      consoleSpy.mockRestore();
      jest.useFakeTimers(); // Restore fake timers
    });

    it('should not flush when queue is empty', async () => {
      await service['flushLogs']();

      expect(mockPrismaService.log.createMany).not.toHaveBeenCalled();
    });

    it('should not flush when already processing', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      service['isProcessing'] = true;
      service.log('Test message');

      await service['flushLogs']();

      expect(mockPrismaService.log.createMany).not.toHaveBeenCalled();

      service['isProcessing'] = false;
      consoleSpy.mockRestore();
    });

    it('should handle database write failure gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const dbError = new Error('Database connection failed');
      mockPrismaService.log.createMany.mockRejectedValue(dbError);

      service.log('Test message');
      await service['flushLogs']();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to write logs to database:',
        dbError,
      );
      expect(service['isProcessing']).toBe(false);

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should be able to manually flush logs', async () => {
      mockPrismaService.log.createMany.mockResolvedValue({ count: 1 });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.log('Test message');

      // Manually trigger flush
      await service['flushLogs']();

      expect(mockPrismaService.log.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            level: LogLevel.INFO,
            message: 'Test message',
          }),
        ]),
      });

      consoleSpy.mockRestore();
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate a valid UUID', () => {
      const id1 = service.generateCorrelationId();
      const id2 = service.generateCorrelationId();

      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(id1).not.toBe(id2);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockPrismaService.log.deleteMany.mockResolvedValue({ count: 100 });

      const result = await service.cleanupOldLogs(30);

      expect(result).toBe(100);
      expect(mockPrismaService.log.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date),
          },
        },
      });

      consoleSpy.mockRestore();
    });

    it('should use default retention period of 30 days', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockPrismaService.log.deleteMany.mockResolvedValue({ count: 50 });

      await service.cleanupOldLogs();

      const call = mockPrismaService.log.deleteMany.mock.calls[0][0];
      const cutoffDate = call.where.timestamp.lt;
      const daysDiff = Math.floor(
        (Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysDiff).toBe(30);

      consoleSpy.mockRestore();
    });

    it('should handle custom retention period', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockPrismaService.log.deleteMany.mockResolvedValue({ count: 75 });

      await service.cleanupOldLogs(60);

      const call = mockPrismaService.log.deleteMany.mock.calls[0][0];
      const cutoffDate = call.where.timestamp.lt;
      const daysDiff = Math.floor(
        (Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysDiff).toBe(60);

      consoleSpy.mockRestore();
    });

    it('should throw error when cleanup fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const dbError = new Error('Database error');
      mockPrismaService.log.deleteMany.mockRejectedValue(dbError);

      await expect(service.cleanupOldLogs()).rejects.toThrow('Database error');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should flush remaining logs on module destroy', async () => {
      const flushSpy = jest.spyOn(service as any, 'flushLogs');

      await service.onModuleDestroy();

      expect(flushSpy).toHaveBeenCalled();

      flushSpy.mockRestore();
    });
  });
});
