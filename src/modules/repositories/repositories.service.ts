import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { UsersService } from '../users/users.service';
import { SyncResponseDto } from './dto/sync-response.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SearchDto } from './dto/search.dto';
import { Repository } from '@prisma/client';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
    private readonly usersService: UsersService,
    @InjectMetric('repository_sync_total')
    private readonly syncCounter: Counter<string>,
    @InjectMetric('repository_sync_duration_seconds')
    private readonly syncDuration: Histogram<string>,
    @InjectMetric('repositories_synced')
    private readonly reposSyncedGauge: Gauge<string>,
    @InjectMetric('repository_searches_total')
    private readonly searchCounter: Counter<string>,
    @InjectMetric('repository_search_duration_seconds')
    private readonly searchDuration: Histogram<string>,
    @InjectMetric('repository_search_results')
    private readonly searchResultsGauge: Gauge<string>,
  ) {}

  /**
   * Synchronize GitHub repositories for a user
   */
  async syncUserRepositories(username: string): Promise<SyncResponseDto> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Fetch user data from GitHub
      const githubUser = await this.githubService.fetchUserData(username);

      // Upsert user in database
      const user = await this.usersService.upsertUser(githubUser);

      // Fetch repositories from GitHub
      const githubRepos =
        await this.githubService.fetchUserRepositories(username);

      // Upsert repositories in parallel
      await Promise.all(
        githubRepos.map((repo) =>
          this.prisma.repository.upsert({
            where: {
              githubId: repo.id,
            },
            update: {
              name: repo.name,
              description: repo.description,
              url: repo.html_url,
              language: repo.language,
              createdAt: new Date(repo.created_at),
              updatedAt: new Date(),
            },
            create: {
              githubId: repo.id,
              name: repo.name,
              description: repo.description,
              url: repo.html_url,
              language: repo.language,
              createdAt: new Date(repo.created_at),
              userId: user.id,
            },
          }),
        ),
      );

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      this.syncCounter.inc({ username, status: 'success' });
      this.syncDuration.observe({ username }, duration);
      this.reposSyncedGauge.set({ username }, githubRepos.length);

      this.logger.log(
        `Synchronized ${githubRepos.length} repositories for user ${username}`,
      );

      return {
        count: githubRepos.length,
        timestamp,
        username,
      };
    } catch (error) {
      // Record failure metric
      const duration = (Date.now() - startTime) / 1000;
      this.syncCounter.inc({ username, status: 'failure' });
      this.syncDuration.observe({ username }, duration);
      throw error;
    }
  }

  /**
   * List repositories for a user with pagination
   */
  async listUserRepositories(
    username: string,
    pagination: PaginationDto,
  ): Promise<ListResponseDto> {
    // Find user by login
    const user = await this.usersService.findByLogin(username);

    if (!user) {
      throw new NotFoundException(`User ${username} not found`);
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    // Fetch repositories with pagination
    const [repositories, total] = await Promise.all([
      this.prisma.repository.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.repository.count({
        where: { userId: user.id },
      }),
    ]);

    return {
      data: repositories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search repositories by keywords with pagination and relevance ordering
   */
  async searchRepositories(searchDto: SearchDto): Promise<SearchResponseDto> {
    const startTime = Date.now();
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 20;
    const skip = (page - 1) * limit;

    // Split keywords and prepare search conditions
    const keywords = searchDto.q.trim().split(/\s+/);

    // Build OR conditions for each keyword across name, description, and language
    const orConditions = keywords.flatMap((keyword) => [
      { name: { contains: keyword, mode: 'insensitive' as const } },
      { description: { contains: keyword, mode: 'insensitive' as const } },
      { language: { contains: keyword, mode: 'insensitive' as const } },
    ]);

    // Execute search with pagination
    const [repositories, total] = await Promise.all([
      this.prisma.repository.findMany({
        where: {
          OR: orConditions,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.repository.count({
        where: {
          OR: orConditions,
        },
      }),
    ]);

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    this.searchCounter.inc({
      has_query: 'true',
      has_language: 'false',
      has_description: 'false',
    });
    this.searchDuration.observe({ has_filters: 'true' }, duration);
    this.searchResultsGauge.set(total);

    return {
      data: repositories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get repository by ID
   */
  async findById(id: number): Promise<Repository | null> {
    return this.prisma.repository.findUnique({
      where: { id },
    });
  }

  /**
   * Get repository by GitHub ID
   */
  async findByGithubId(githubId: number): Promise<Repository | null> {
    return this.prisma.repository.findUnique({
      where: { githubId },
    });
  }
}
