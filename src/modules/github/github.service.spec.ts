import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import {
  NotFoundException,
  BadGatewayException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { GithubService } from './github.service';

describe('GithubService', () => {
  let service: GithubService;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
    httpService = module.get<HttpService>(HttpService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchUserData', () => {
    const mockUserData = {
      id: 123456,
      login: 'testuser',
      avatar_url: 'https://github.com/avatar.png',
      name: 'Test User',
    };

    it('should successfully fetch user data', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: mockUserData,
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '60',
          'x-ratelimit-limit': '60',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchUserData('testuser');

      expect(result).toEqual(mockUserData);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/users/testuser',
        expect.objectContaining({
          timeout: 10000,
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'NestJS-GitHub-API',
          },
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => mockError as AxiosError),
      );

      await expect(service.fetchUserData('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.fetchUserData('nonexistent')).rejects.toThrow(
        'GitHub user not found',
      );
    });

    it('should throw HttpException when rate limit is exceeded', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 60;
      const mockError: Partial<AxiosError> = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {
            'x-ratelimit-reset': String(resetTime),
          },
          config: {} as any,
        },
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => mockError as AxiosError),
      );

      await expect(service.fetchUserData('testuser')).rejects.toThrow(
        HttpException,
      );
      await expect(service.fetchUserData('testuser')).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.TOO_MANY_REQUESTS,
        }),
      );
    });

    it('should retry on transient failures and eventually succeed', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Network error',
        isAxiosError: true,
      };

      const mockSuccessResponse: Partial<AxiosResponse> = {
        data: mockUserData,
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '60',
          'x-ratelimit-limit': '60',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        config: {} as any,
      };

      // First call fails, second succeeds
      mockHttpService.get
        .mockReturnValueOnce(throwError(() => mockError as AxiosError))
        .mockReturnValueOnce(of(mockSuccessResponse));

      const result = await service.fetchUserData('testuser');

      expect(result).toEqual(mockUserData);
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    });

    it('should throw BadGatewayException after all retries exhausted', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Network error',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => mockError as AxiosError),
      );

      await expect(service.fetchUserData('testuser')).rejects.toThrow(
        BadGatewayException,
      );
      expect(mockHttpService.get).toHaveBeenCalledTimes(3); // maxRetries = 3
    });

    it('should log warning when rate limit is low', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      const mockResponse: Partial<AxiosResponse> = {
        data: mockUserData,
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '5', // Low remaining
          'x-ratelimit-limit': '60',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await service.fetchUserData('testuser');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub API rate limit low'),
      );
    });
  });

  describe('fetchUserRepositories', () => {
    const mockReposData = [
      {
        id: 1,
        name: 'repo1',
        description: 'Test repo 1',
        html_url: 'https://github.com/testuser/repo1',
        language: 'TypeScript',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'repo2',
        description: 'Test repo 2',
        html_url: 'https://github.com/testuser/repo2',
        language: 'JavaScript',
        created_at: '2024-01-02T00:00:00Z',
      },
    ];

    it('should successfully fetch user repositories', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: mockReposData,
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '60',
          'x-ratelimit-limit': '60',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchUserRepositories('testuser');

      expect(result).toEqual(mockReposData);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/users/testuser/repos?per_page=100',
        expect.objectContaining({
          timeout: 10000,
        }),
      );
    });

    it('should return empty array when no repositories found', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '60',
          'x-ratelimit-limit': '60',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchUserRepositories('testuser');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => mockError as AxiosError),
      );

      await expect(
        service.fetchUserRepositories('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
