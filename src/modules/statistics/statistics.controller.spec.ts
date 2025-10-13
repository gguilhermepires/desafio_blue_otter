import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { BadRequestException } from '@nestjs/common';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let service: StatisticsService;

  const mockStatisticsService = {
    generateStatistics: jest.fn(),
  };

  const mockGlobalStats = {
    summary: {
      total_repos: 100,
      total_users: 10,
    },
    languages: {
      TypeScript: 50,
      JavaScript: 30,
      Python: 20,
    },
    timeline_created_monthly: {
      '2024-01': 30,
      '2024-02': 40,
      '2024-03': 30,
    },
    top_users_by_repos: [
      { login: 'user1', count: 25 },
      { login: 'user2', count: 20 },
      { login: 'user3', count: 15 },
      { login: 'user4', count: 10 },
      { login: 'user5', count: 5 },
    ],
  };

  const mockUserStats = {
    summary: {
      total_repos: 25,
    },
    languages: {
      TypeScript: 15,
      JavaScript: 10,
    },
    timeline_created_monthly: {
      '2024-01': 10,
      '2024-02': 15,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: StatisticsService,
          useValue: mockStatisticsService,
        },
      ],
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
    service = module.get<StatisticsService>(StatisticsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatistics', () => {
    it('should get global statistics with default topN', async () => {
      mockStatisticsService.generateStatistics.mockResolvedValue(
        mockGlobalStats,
      );

      const result = await controller.getStatistics({});

      expect(result).toEqual(mockGlobalStats);
      expect(service.generateStatistics).toHaveBeenCalledWith({});
    });

    it('should get global statistics with custom topN', async () => {
      mockStatisticsService.generateStatistics.mockResolvedValue(
        mockGlobalStats,
      );

      const result = await controller.getStatistics({ topN: 10 });

      expect(result).toEqual(mockGlobalStats);
      expect(service.generateStatistics).toHaveBeenCalledWith({ topN: 10 });
    });

    it('should get user-specific statistics', async () => {
      mockStatisticsService.generateStatistics.mockResolvedValue(mockUserStats);

      const result = await controller.getStatistics({ user: 'testuser' });

      expect(result).toEqual(mockUserStats);
      expect(result.summary).not.toHaveProperty('total_users');
      expect(result).not.toHaveProperty('top_users_by_repos');
      expect(service.generateStatistics).toHaveBeenCalledWith({
        user: 'testuser',
      });
    });

    it('should get user-specific statistics with topN (ignored)', async () => {
      mockStatisticsService.generateStatistics.mockResolvedValue(mockUserStats);

      const result = await controller.getStatistics({
        user: 'testuser',
        topN: 10,
      });

      expect(result).toEqual(mockUserStats);
      expect(service.generateStatistics).toHaveBeenCalledWith({
        user: 'testuser',
        topN: 10,
      });
    });

    it('should handle empty statistics', async () => {
      const emptyStats = {
        summary: {
          total_repos: 0,
          total_users: 0,
        },
        languages: {},
        timeline_created_monthly: {},
        top_users_by_repos: [],
      };
      mockStatisticsService.generateStatistics.mockResolvedValue(emptyStats);

      const result = await controller.getStatistics({});

      expect(result.summary.total_repos).toBe(0);
      expect(result.languages).toEqual({});
      expect(result.top_users_by_repos).toEqual([]);
    });

    it('should handle statistics with null languages', async () => {
      const statsWithNull = {
        ...mockGlobalStats,
        languages: {
          TypeScript: 50,
          null: 10,
        },
      };
      mockStatisticsService.generateStatistics.mockResolvedValue(statsWithNull);

      const result = await controller.getStatistics({});

      expect(result.languages).toHaveProperty('null');
      expect(result.languages.null).toBe(10);
    });

    it('should handle statistics with large topN', async () => {
      const statsWithManyUsers = {
        ...mockGlobalStats,
        top_users_by_repos: Array(20)
          .fill(null)
          .map((_, i) => ({
            login: `user${i + 1}`,
            count: 20 - i,
          })),
      };
      mockStatisticsService.generateStatistics.mockResolvedValue(
        statsWithManyUsers,
      );

      const result = await controller.getStatistics({ topN: 20 });

      expect(result.top_users_by_repos).toHaveLength(20);
    });

    it('should handle timeline spanning years', async () => {
      const statsWithTimeline = {
        ...mockGlobalStats,
        timeline_created_monthly: {
          '2023-11': 5,
          '2023-12': 10,
          '2024-01': 15,
          '2024-02': 20,
        },
      };
      mockStatisticsService.generateStatistics.mockResolvedValue(
        statsWithTimeline,
      );

      const result = await controller.getStatistics({});

      expect(Object.keys(result.timeline_created_monthly)).toHaveLength(4);
      expect(result.timeline_created_monthly['2023-11']).toBe(5);
      expect(result.timeline_created_monthly['2024-02']).toBe(20);
    });

    it('should handle multiple languages in statistics', async () => {
      const statsWithLanguages = {
        ...mockGlobalStats,
        languages: {
          TypeScript: 30,
          JavaScript: 25,
          Python: 20,
          Rust: 15,
          Go: 10,
        },
      };
      mockStatisticsService.generateStatistics.mockResolvedValue(
        statsWithLanguages,
      );

      const result = await controller.getStatistics({});

      expect(Object.keys(result.languages)).toHaveLength(5);
    });
  });
});
