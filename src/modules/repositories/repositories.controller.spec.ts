import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RepositoriesController', () => {
  let controller: RepositoriesController;
  let service: RepositoriesService;

  const mockRepositoriesService = {
    syncUserRepositories: jest.fn(),
    listUserRepositories: jest.fn(),
    searchRepositories: jest.fn(),
  };

  const mockSyncResponse = {
    count: 10,
    timestamp: new Date(),
    username: 'testuser',
  };

  const mockListResponse = {
    data: [
      {
        id: 1,
        githubId: 111111,
        name: 'test-repo',
        description: 'Test repository',
        url: 'https://github.com/testuser/test-repo',
        language: 'TypeScript',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        userId: 1,
      },
    ],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepositoriesController],
      providers: [
        {
          provide: RepositoriesService,
          useValue: mockRepositoriesService,
        },
      ],
    }).compile();

    controller = module.get<RepositoriesController>(RepositoriesController);
    service = module.get<RepositoriesService>(RepositoriesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('syncRepositories', () => {
    it('should sync user repositories successfully', async () => {
      mockRepositoriesService.syncUserRepositories.mockResolvedValue(
        mockSyncResponse,
      );

      const result = await controller.syncRepositories('testuser');

      expect(result).toEqual(mockSyncResponse);
      expect(service.syncUserRepositories).toHaveBeenCalledWith('testuser');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepositoriesService.syncUserRepositories.mockRejectedValue(
        new NotFoundException('GitHub user not found'),
      );

      await expect(controller.syncRepositories('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle API errors', async () => {
      mockRepositoriesService.syncUserRepositories.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(controller.syncRepositories('testuser')).rejects.toThrow(
        'API Error',
      );
    });
  });

  describe('listRepositories', () => {
    it('should list repositories with default pagination', async () => {
      mockRepositoriesService.listUserRepositories.mockResolvedValue(
        mockListResponse,
      );

      const result = await controller.listRepositories('testuser', {});

      expect(result).toEqual(mockListResponse);
      expect(service.listUserRepositories).toHaveBeenCalledWith('testuser', {});
    });

    it('should list repositories with custom pagination', async () => {
      mockRepositoriesService.listUserRepositories.mockResolvedValue(
        mockListResponse,
      );

      const result = await controller.listRepositories('testuser', {
        page: 2,
        limit: 10,
      });

      expect(result).toEqual(mockListResponse);
      expect(service.listUserRepositories).toHaveBeenCalledWith('testuser', {
        page: 2,
        limit: 10,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepositoriesService.listUserRepositories.mockRejectedValue(
        new NotFoundException('User testuser not found'),
      );

      await expect(controller.listRepositories('testuser', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty list when user has no repositories', async () => {
      const emptyResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockRepositoriesService.listUserRepositories.mockResolvedValue(
        emptyResponse,
      );

      const result = await controller.listRepositories('testuser', {});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('searchRepositories', () => {
    it('should search repositories with keyword', async () => {
      mockRepositoriesService.searchRepositories.mockResolvedValue(
        mockListResponse,
      );

      const result = await controller.searchRepositories({
        q: 'TypeScript',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(mockListResponse);
      expect(service.searchRepositories).toHaveBeenCalledWith({
        q: 'TypeScript',
        page: 1,
        limit: 20,
      });
    });

    it('should search repositories with multiple keywords', async () => {
      mockRepositoriesService.searchRepositories.mockResolvedValue(
        mockListResponse,
      );

      const result = await controller.searchRepositories({
        q: 'TypeScript React',
        page: 1,
        limit: 20,
      });

      expect(service.searchRepositories).toHaveBeenCalledWith({
        q: 'TypeScript React',
        page: 1,
        limit: 20,
      });
    });

    it('should return empty array when no matches found', async () => {
      const emptyResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockRepositoriesService.searchRepositories.mockResolvedValue(
        emptyResponse,
      );

      const result = await controller.searchRepositories({
        q: 'nonexistent',
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([]);
    });

    it('should handle pagination in search', async () => {
      const paginatedResponse = {
        ...mockListResponse,
        meta: { total: 100, page: 3, limit: 10, totalPages: 10 },
      };
      mockRepositoriesService.searchRepositories.mockResolvedValue(
        paginatedResponse,
      );

      const result = await controller.searchRepositories({
        q: 'test',
        page: 3,
        limit: 10,
      });

      expect(result.meta).toEqual({
        total: 100,
        page: 3,
        limit: 10,
        totalPages: 10,
      });
    });
  });
});
