import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { GitHubUser } from './interfaces/github-user.interface';
import { GitHubRepository } from './interfaces/github-repo.interface';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly baseUrl = 'https://api.github.com';
  private readonly timeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetch user data from GitHub API
   */
  async fetchUserData(username: string): Promise<GitHubUser> {
    const url = `${this.baseUrl}/users/${username}`;
    return this.fetchWithRetry<GitHubUser>(url);
  }

  /**
   * Fetch all repositories for a user from GitHub API
   */
  async fetchUserRepositories(username: string): Promise<GitHubRepository[]> {
    const url = `${this.baseUrl}/users/${username}/repos?per_page=100`;
    const repos = await this.fetchWithRetry<GitHubRepository[]>(url);
    return repos || [];
  }

  /**
   * Fetch data with retry logic and exponential backoff
   */
  private async fetchWithRetry<T>(
    url: string,
    retries = this.maxRetries,
  ): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<T>(url, {
            timeout: this.timeout,
            headers: {
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'NestJS-GitHub-API',
            },
          }),
        );

        // Check rate limit
        this.checkRateLimit(response);

        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;

        // Handle 404 Not Found
        if (axiosError.response?.status === 404) {
          throw new NotFoundException('GitHub user not found');
        }

        // Handle 429 Rate Limit
        if (axiosError.response?.status === 429) {
          const resetTime = axiosError.response.headers['x-ratelimit-reset'];
          const waitTime = resetTime
            ? parseInt(resetTime) * 1000 - Date.now()
            : 60000;

          this.logger.warn(
            `GitHub rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000)}s`,
          );

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'GitHub API rate limit exceeded',
              retryAfter: Math.ceil(waitTime / 1000),
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        // Retry with exponential backoff for other errors
        if (attempt < retries - 1) {
          const backoffTime = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `Request failed (attempt ${attempt + 1}/${retries}). Retrying in ${backoffTime}ms...`,
          );
          await this.sleep(backoffTime);
          continue;
        }

        // All retries exhausted
        this.logger.error(
          `GitHub API request failed after ${retries} attempts: ${axiosError.message}`,
        );
        throw new BadGatewayException('GitHub API request failed');
      }
    }

    throw new BadGatewayException('GitHub API request failed');
  }

  /**
   * Check rate limit headers and log warnings
   */
  private checkRateLimit(response: AxiosResponse): void {
    const remaining = response.headers['x-ratelimit-remaining'];
    const limit = response.headers['x-ratelimit-limit'];
    const reset = response.headers['x-ratelimit-reset'];

    if (remaining && parseInt(remaining) < 10) {
      const resetDate = new Date(parseInt(reset) * 1000);
      this.logger.warn(
        `GitHub API rate limit low: ${remaining}/${limit} requests remaining. Resets at ${resetDate.toISOString()}`,
      );
    }
  }

  /**
   * Sleep utility for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
