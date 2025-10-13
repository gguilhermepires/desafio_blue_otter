import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { GitHubUser } from '../github/interfaces/github-user.interface';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    repository: {
      count: jest.fn(),
    },
  };

  const mockUser: User = {
    id: 1,
    githubId: 123456,
    login: 'testuser',
    avatarUrl: 'https://github.com/avatar.png',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockGithubUser: GitHubUser = {
    id: 123456,
    login: 'testuser',
    avatar_url: 'https://github.com/avatar.png',
    name: 'Test User',
    email: null,
    bio: null,
    public_repos: 10,
    followers: 5,
    following: 3,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertUser', () => {
    it('should create a new user when user does not exist', async () => {
      mockPrismaService.user.upsert.mockResolvedValue(mockUser);

      const result = await service.upsertUser(mockGithubUser);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { githubId: mockGithubUser.id },
        update: {
          login: mockGithubUser.login,
          avatarUrl: mockGithubUser.avatar_url,
          updatedAt: expect.any(Date),
        },
        create: {
          githubId: mockGithubUser.id,
          login: mockGithubUser.login,
          avatarUrl: mockGithubUser.avatar_url,
        },
      });
    });

    it('should update existing user when user already exists', async () => {
      const updatedGithubUser: GitHubUser = {
        ...mockGithubUser,
        login: 'updateduser',
        avatar_url: 'https://github.com/new-avatar.png',
      };

      const updatedUser: User = {
        ...mockUser,
        login: 'updateduser',
        avatarUrl: 'https://github.com/new-avatar.png',
        updatedAt: new Date(),
      };

      mockPrismaService.user.upsert.mockResolvedValue(updatedUser);

      const result = await service.upsertUser(updatedGithubUser);

      expect(result).toEqual(updatedUser);
      expect(result.login).toBe('updateduser');
      expect(result.avatarUrl).toBe('https://github.com/new-avatar.png');
    });

    it('should throw error when database operation fails', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.user.upsert.mockRejectedValue(error);

      await expect(service.upsertUser(mockGithubUser)).rejects.toThrow(error);
    });

    it('should handle user with null avatar URL', async () => {
      const userWithoutAvatar: GitHubUser = {
        ...mockGithubUser,
        avatar_url: null,
      };

      const userResult: User = {
        ...mockUser,
        avatarUrl: null,
      };

      mockPrismaService.user.upsert.mockResolvedValue(userResult);

      const result = await service.upsertUser(userWithoutAvatar);

      expect(result.avatarUrl).toBeNull();
    });
  });

  describe('findByLogin', () => {
    it('should find user by login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByLogin('testuser');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { login: 'testuser' },
      });
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByLogin('nonexistent');

      expect(result).toBeNull();
    });

    it('should be case-sensitive when searching by login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.findByLogin('TestUser');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { login: 'TestUser' },
      });
    });
  });

  describe('findByGithubId', () => {
    it('should find user by GitHub ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByGithubId(123456);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { githubId: 123456 },
      });
    });

    it('should return null when user with GitHub ID is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByGithubId(999999);

      expect(result).toBeNull();
    });
  });

  describe('getUserWithRepoCount', () => {
    it('should return user with repository count', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.repository.count.mockResolvedValue(5);

      const result = await service.getUserWithRepoCount('testuser');

      expect(result).toEqual({
        user: mockUser,
        repoCount: 5,
      });
      expect(mockPrismaService.repository.count).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });

    it('should return null user and zero count when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserWithRepoCount('nonexistent');

      expect(result).toEqual({
        user: null,
        repoCount: 0,
      });
      expect(mockPrismaService.repository.count).not.toHaveBeenCalled();
    });

    it('should return zero count when user has no repositories', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.repository.count.mockResolvedValue(0);

      const result = await service.getUserWithRepoCount('testuser');

      expect(result).toEqual({
        user: mockUser,
        repoCount: 0,
      });
    });
  });
});
