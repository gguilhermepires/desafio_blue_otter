import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GitHubUser } from '../github/interfaces/github-user.interface';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert user data from GitHub
   * Creates new user or updates existing one based on githubId
   */
  async upsertUser(githubUser: GitHubUser): Promise<User> {
    try {
      const user = await this.prisma.user.upsert({
        where: {
          githubId: githubUser.id,
        },
        update: {
          login: githubUser.login,
          avatarUrl: githubUser.avatar_url,
          updatedAt: new Date(),
        },
        create: {
          githubId: githubUser.id,
          login: githubUser.login,
          avatarUrl: githubUser.avatar_url,
        },
      });

      this.logger.log(`User upserted: ${user.login} (ID: ${user.id})`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to upsert user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by login
   */
  async findByLogin(login: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { login },
    });
  }

  /**
   * Find user by GitHub ID
   */
  async findByGithubId(githubId: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { githubId },
    });
  }

  /**
   * Get user with repository count
   */
  async getUserWithRepoCount(login: string): Promise<{
    user: User | null;
    repoCount: number;
  }> {
    const user = await this.findByLogin(login);

    if (!user) {
      return { user: null, repoCount: 0 };
    }

    const repoCount = await this.prisma.repository.count({
      where: { userId: user.id },
    });

    return { user, repoCount };
  }
}
