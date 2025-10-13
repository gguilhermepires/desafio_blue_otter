import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    repository: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateStatistics - Global', () => {
    it('should generate global statistics with default topN', async () => {
      const mockLanguageGroups = [
        { language: 'TypeScript', _count: { language: 10 } },
        { language: 'JavaScript', _count: { language: 5 } },
        { language: null, _count: { language: 2 } },
      ];

      const mockUserGroups = [
        { userId: 1, _count: { id: 15 } },
        { userId: 2, _count: { id: 10 } },
      ];

      const mockUsers = [
        { id: 1, login: 'user1' },
        { id: 2, login: 'user2' },
      ];

      const mockRepositories = [
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-20') },
        { createdAt: new Date('2024-02-10') },
      ];

      mockPrismaService.repository.count.mockResolvedValue(17);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce(mockLanguageGroups)
        .mockResolvedValueOnce(mockUserGroups);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.repository.findMany.mockResolvedValue(mockRepositories);

      const result = await service.generateStatistics({});

      expect(result).toMatchObject({
        summary: {
          total_repos: 17,
          total_users: 2,
        },
        languages: {
          TypeScript: 10,
          JavaScript: 5,
          null: 2,
        },
        timeline_created_monthly: {
          '2024-01': 2,
          '2024-02': 1,
        },
        top_users_by_repos: [
          { login: 'user1', count: 15 },
          { login: 'user2', count: 10 },
        ],
      });
    });

    it('should generate global statistics with custom topN', async () => {
      const mockUserGroups = [
        { userId: 1, _count: { id: 20 } },
        { userId: 2, _count: { id: 15 } },
        { userId: 3, _count: { id: 10 } },
      ];

      const mockUsers = [
        { id: 1, login: 'user1' },
        { id: 2, login: 'user2' },
        { id: 3, login: 'user3' },
      ];

      mockPrismaService.repository.count.mockResolvedValue(45);
      mockPrismaService.user.count.mockResolvedValue(3);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockUserGroups);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.generateStatistics({ topN: 10 });

      expect(result.top_users_by_repos).toHaveLength(3);
      expect(mockPrismaService.repository.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should handle empty database', async () => {
      mockPrismaService.repository.count.mockResolvedValue(0);
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.generateStatistics({});

      expect(result).toEqual({
        summary: {
          total_repos: 0,
          total_users: 0,
        },
        languages: {},
        timeline_created_monthly: {},
        top_users_by_repos: [],
      });
    });
  });

  describe('generateStatistics - User-specific', () => {
    it('should generate statistics for specific user', async () => {
      const mockLanguageGroups = [
        { language: 'TypeScript', _count: { language: 5 } },
        { language: 'JavaScript', _count: { language: 3 } },
      ];

      const mockRepositories = [
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-20') },
      ];

      mockPrismaService.repository.count.mockResolvedValue(8);
      mockPrismaService.repository.groupBy.mockResolvedValue(
        mockLanguageGroups,
      );
      mockPrismaService.repository.findMany.mockResolvedValue(mockRepositories);

      const result = await service.generateStatistics({ user: 'testuser' });

      expect(result).toMatchObject({
        summary: {
          total_repos: 8,
        },
        languages: {
          TypeScript: 5,
          JavaScript: 3,
        },
        timeline_created_monthly: {
          '2024-01': 2,
        },
      });
      expect(result).not.toHaveProperty('top_users_by_repos');
      expect(result.summary).not.toHaveProperty('total_users');
    });

    it('should filter by user login correctly', async () => {
      mockPrismaService.repository.count.mockResolvedValue(5);
      mockPrismaService.repository.groupBy.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      await service.generateStatistics({ user: 'testuser' });

      expect(mockPrismaService.repository.count).toHaveBeenCalledWith({
        where: {
          user: {
            login: 'testuser',
          },
        },
      });
    });
  });

  describe('Language Statistics', () => {
    it('should group languages correctly', async () => {
      const mockLanguageGroups = [
        { language: 'TypeScript', _count: { language: 10 } },
        { language: 'Python', _count: { language: 7 } },
        { language: 'Rust', _count: { language: 3 } },
      ];

      mockPrismaService.repository.count.mockResolvedValue(20);
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce(mockLanguageGroups)
        .mockResolvedValueOnce([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.generateStatistics({});

      expect(result.languages).toEqual({
        TypeScript: 10,
        Python: 7,
        Rust: 3,
      });
    });

    it('should handle repositories with null language', async () => {
      const mockLanguageGroups = [
        { language: 'JavaScript', _count: { language: 5 } },
        { language: null, _count: { language: 3 } },
      ];

      mockPrismaService.repository.count.mockResolvedValue(8);
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce(mockLanguageGroups)
        .mockResolvedValueOnce([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.generateStatistics({});

      expect(result.languages).toEqual({
        JavaScript: 5,
        null: 3,
      });
    });
  });

  describe('Timeline Statistics', () => {
    it('should generate timeline with all months filled', async () => {
      const mockRepositories = [
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-03-10') },
        { createdAt: new Date('2024-03-20') },
      ];

      mockPrismaService.repository.count.mockResolvedValue(3);
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue(mockRepositories);

      const result = await service.generateStatistics({});

      expect(result.timeline_created_monthly).toEqual({
        '2024-01': 1,
        '2024-02': 0,
        '2024-03': 2,
      });
    });

    it('should handle timeline spanning multiple years', async () => {
      const mockRepositories = [
        { createdAt: new Date('2023-11-15') },
        { createdAt: new Date('2023-12-20') },
        { createdAt: new Date('2024-01-10') },
        { createdAt: new Date('2024-02-05') },
      ];

      mockPrismaService.repository.count.mockResolvedValue(4);
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue(mockRepositories);

      const result = await service.generateStatistics({});

      expect(result.timeline_created_monthly).toEqual({
        '2023-11': 1,
        '2023-12': 1,
        '2024-01': 1,
        '2024-02': 1,
      });
    });

    it('should return empty timeline when no repositories', async () => {
      mockPrismaService.repository.count.mockResolvedValue(0);
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.generateStatistics({});

      expect(result.timeline_created_monthly).toEqual({});
    });
  });

  describe('Top Users', () => {
    it('should return top users ordered by repository count', async () => {
      const mockUserGroups = [
        { userId: 1, _count: { id: 25 } },
        { userId: 2, _count: { id: 20 } },
        { userId: 3, _count: { id: 15 } },
        { userId: 4, _count: { id: 10 } },
        { userId: 5, _count: { id: 5 } },
      ];

      const mockUsers = [
        { id: 1, login: 'user1' },
        { id: 2, login: 'user2' },
        { id: 3, login: 'user3' },
        { id: 4, login: 'user4' },
        { id: 5, login: 'user5' },
      ];

      mockPrismaService.repository.count.mockResolvedValue(75);
      mockPrismaService.user.count.mockResolvedValue(5);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockUserGroups);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.generateStatistics({});

      expect(result.top_users_by_repos).toEqual([
        { login: 'user1', count: 25 },
        { login: 'user2', count: 20 },
        { login: 'user3', count: 15 },
        { login: 'user4', count: 10 },
        { login: 'user5', count: 5 },
      ]);
    });

    it('should handle user not found in lookup', async () => {
      const mockUserGroups = [
        { userId: 1, _count: { id: 10 } },
        { userId: 2, _count: { id: 5 } },
      ];

      const mockUsers = [{ id: 1, login: 'user1' }]; // userId 2 is missing

      mockPrismaService.repository.count.mockResolvedValue(15);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.repository.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockUserGroups);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.generateStatistics({});

      expect(result.top_users_by_repos).toEqual([
        { login: 'user1', count: 10 },
        { login: 'unknown', count: 5 },
      ]);
    });

    it('should not include top users for user-specific stats', async () => {
      mockPrismaService.repository.count.mockResolvedValue(5);
      mockPrismaService.repository.groupBy.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.generateStatistics({ user: 'testuser' });

      expect(result).not.toHaveProperty('top_users_by_repos');
    });
  });
});
