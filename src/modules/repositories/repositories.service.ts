import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  ) {}

  /**
   * Synchronize GitHub repositories for a user
   */
  async syncUserRepositories(username: string): Promise<SyncResponseDto> {
    const timestamp = new Date();

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

    this.logger.log(
      `Synchronized ${githubRepos.length} repositories for user ${username}`,
    );

    return {
      count: githubRepos.length,
      timestamp,
      username,
    };
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
