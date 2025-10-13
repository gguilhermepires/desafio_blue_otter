import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { UsersService } from '../users/users.service';
import { Repository, User } from '@prisma/client';

describe('RepositoriesService', () => {
  let service: RepositoriesService;
  let prismaService: PrismaService;
  let githubService: GithubService;
  let usersService: UsersService;

  const mockUser: User = {
    id: 1,
    githubId: 123456,
    login: 'testuser',
    avatarUrl: 'https://github.com/avatar.png',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRepository: Repository = {
    id: 1,
    githubId: 111111,
    name: 'test-repo',
    description: 'Test repository',
    url: 'https://github.com/testuser/test-repo',
    language: 'TypeScript',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 1,
  };

  const mockGithubUser = {
    id: 123456,
    login: 'testuser',
    avatar_url: 'https://github.com/avatar.png',
    name: 'Test User',
  };

  const mockGithubRepos = [
    {
      id: 111111,
      name: 'test-repo',
      description: 'Test repository',
      html_url: 'https://github.com/testuser/test-repo',
      language: 'TypeScript',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 222222,
      name: 'another-repo',
      description: 'Another repository',
      html_url: 'https://github.com/testuser/another-repo',
      language: 'JavaScript',
      created_at: '2024-01-02T00:00:00Z',
    },
  ];

  const mockPrismaService = {
    repository: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockGithubService = {
    fetchUserData: jest.fn(),
    fetchUserRepositories: jest.fn(),
  };

  const mockUsersService = {
    upsertUser: jest.fn(),
    findByLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GithubService,
          useValue: mockGithubService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
    prismaService = module.get<PrismaService>(PrismaService);
    githubService = module.get<GithubService>(GithubService);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncUserRepositories', () => {
    it('should successfully sync user repositories', async () => {
      mockGithubService.fetchUserData.mockResolvedValue(mockGithubUser);
      mockUsersService.upsertUser.mockResolvedValue(mockUser);
      mockGithubService.fetchUserRepositories.mockResolvedValue(
        mockGithubRepos,
      );
      mockPrismaService.repository.upsert.mockResolvedValue(mockRepository);

      const result = await service.syncUserRepositories('testuser');

      expect(result).toMatchObject({
        count: 2,
        username: 'testuser',
      });
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockGithubService.fetchUserData).toHaveBeenCalledWith('testuser');
      expect(mockUsersService.upsertUser).toHaveBeenCalledWith(mockGithubUser);
      expect(mockGithubService.fetchUserRepositories).toHaveBeenCalledWith(
        'testuser',
      );
      expect(mockPrismaService.repository.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle user with no repositories', async () => {
      mockGithubService.fetchUserData.mockResolvedValue(mockGithubUser);
      mockUsersService.upsertUser.mockResolvedValue(mockUser);
      mockGithubService.fetchUserRepositories.mockResolvedValue([]);

      const result = await service.syncUserRepositories('testuser');

      expect(result.count).toBe(0);
      expect(mockPrismaService.repository.upsert).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when GitHub user not found', async () => {
      mockGithubService.fetchUserData.mockRejectedValue(
        new NotFoundException('GitHub user not found'),
      );

      await expect(service.syncUserRepositories('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should properly upsert repositories with all fields', async () => {
      mockGithubService.fetchUserData.mockResolvedValue(mockGithubUser);
      mockUsersService.upsertUser.mockResolvedValue(mockUser);
      mockGithubService.fetchUserRepositories.mockResolvedValue([
        mockGithubRepos[0],
      ]);
      mockPrismaService.repository.upsert.mockResolvedValue(mockRepository);

      await service.syncUserRepositories('testuser');

      expect(mockPrismaService.repository.upsert).toHaveBeenCalledWith({
        where: { githubId: 111111 },
        update: {
          name: 'test-repo',
          description: 'Test repository',
          url: 'https://github.com/testuser/test-repo',
          language: 'TypeScript',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        create: {
          githubId: 111111,
          name: 'test-repo',
          description: 'Test repository',
          url: 'https://github.com/testuser/test-repo',
          language: 'TypeScript',
          createdAt: expect.any(Date),
          userId: 1,
        },
      });
    });

    it('should handle repositories with null descriptions and languages', async () => {
      const repoWithNulls = {
        ...mockGithubRepos[0],
        description: null,
        language: null,
      };

      mockGithubService.fetchUserData.mockResolvedValue(mockGithubUser);
      mockUsersService.upsertUser.mockResolvedValue(mockUser);
      mockGithubService.fetchUserRepositories.mockResolvedValue([
        repoWithNulls,
      ]);
      mockPrismaService.repository.upsert.mockResolvedValue(mockRepository);

      await service.syncUserRepositories('testuser');

      expect(mockPrismaService.repository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            description: null,
            language: null,
          }),
          create: expect.objectContaining({
            description: null,
            language: null,
          }),
        }),
      );
    });
  });

  describe('listUserRepositories', () => {
    it('should list repositories with pagination', async () => {
      const repositories = [mockRepository];
      mockUsersService.findByLogin.mockResolvedValue(mockUser);
      mockPrismaService.repository.findMany.mockResolvedValue(repositories);
      mockPrismaService.repository.count.mockResolvedValue(10);

      const result = await service.listUserRepositories('testuser', {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        data: repositories,
        meta: {
          total: 10,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findByLogin.mockResolvedValue(null);

      await expect(
        service.listUserRepositories('nonexistent', { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.listUserRepositories('nonexistent', { page: 1, limit: 20 }),
      ).rejects.toThrow('User nonexistent not found');
    });

    it('should handle pagination correctly for page 2', async () => {
      mockUsersService.findByLogin.mockResolvedValue(mockUser);
      mockPrismaService.repository.findMany.mockResolvedValue([]);
      mockPrismaService.repository.count.mockResolvedValue(50);

      const result = await service.listUserRepositories('testuser', {
        page: 2,
        limit: 20,
      });

      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        skip: 20,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.meta).toEqual({
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });

    it('should return empty array when user has no repositories', async () => {
      mockUsersService.findByLogin.mockResolvedValue(mockUser);
      mockPrismaService.repository.findMany.mockResolvedValue([]);
      mockPrismaService.repository.count.mockResolvedValue(0);

      const result = await service.listUserRepositories('testuser', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should use default pagination values when not provided', async () => {
      mockUsersService.findByLogin.mockResolvedValue(mockUser);
      mockPrismaService.repository.findMany.mockResolvedValue([]);
      mockPrismaService.repository.count.mockResolvedValue(0);

      await service.listUserRepositories('testuser', {});

      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('searchRepositories', () => {
    it('should search repositories with single keyword', async () => {
      const repositories = [mockRepository];
      mockPrismaService.repository.findMany.mockResolvedValue(repositories);
      mockPrismaService.repository.count.mockResolvedValue(1);

      const result = await service.searchRepositories({
        q: 'TypeScript',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        data: repositories,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'TypeScript', mode: 'insensitive' } },
            { description: { contains: 'TypeScript', mode: 'insensitive' } },
            { language: { contains: 'TypeScript', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search repositories with multiple keywords', async () => {
      mockPrismaService.repository.findMany.mockResolvedValue([]);
      mockPrismaService.repository.count.mockResolvedValue(0);

      await service.searchRepositories({
        q: 'TypeScript React',
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'TypeScript', mode: 'insensitive' } },
            { description: { contains: 'TypeScript', mode: 'insensitive' } },
            { language: { contains: 'TypeScript', mode: 'insensitive' } },
            { name: { contains: 'React', mode: 'insensitive' } },
            { description: { contains: 'React', mode: 'insensitive' } },
            { language: { contains: 'React', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle case-insensitive search', async () => {
      mockPrismaService.repository.findMany.mockResolvedValue([]);
      mockPrismaService.repository.count.mockResolvedValue(0);

      await service.searchRepositories({
        q: 'typescript',
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'typescript', mode: 'insensitive' },
              }),
            ]),
          },
        }),
      );
    });

    it('should return empty array when no matches found', async () => {
      mockPrismaService.repository.findMany.mockResolvedValue([]);
      mockPrismaService.repository.count.mockResolvedValue(0);

      const result = await service.searchRepositories({
        q: 'nonexistent',
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle pagination in search', async () => {
      mockPrismaService.repository.findMany.mockResolvedValue([]);
      mockPrismaService.repository.count.mockResolvedValue(100);

      const result = await service.searchRepositories({
        q: 'test',
        page: 3,
        limit: 10,
      });

      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({
        total: 100,
        page: 3,
        limit: 10,
        totalPages: 10,
      });
    });
  });

  describe('findById', () => {
    it('should find repository by ID', async () => {
      mockPrismaService.repository.findUnique.mockResolvedValue(mockRepository);

      const result = await service.findById(1);

      expect(result).toEqual(mockRepository);
      expect(mockPrismaService.repository.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when repository not found', async () => {
      mockPrismaService.repository.findUnique.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByGithubId', () => {
    it('should find repository by GitHub ID', async () => {
      mockPrismaService.repository.findUnique.mockResolvedValue(mockRepository);

      const result = await service.findByGithubId(111111);

      expect(result).toEqual(mockRepository);
      expect(mockPrismaService.repository.findUnique).toHaveBeenCalledWith({
        where: { githubId: 111111 },
      });
    });

    it('should return null when repository not found', async () => {
      mockPrismaService.repository.findUnique.mockResolvedValue(null);

      const result = await service.findByGithubId(999999);

      expect(result).toBeNull();
    });
  });
});
