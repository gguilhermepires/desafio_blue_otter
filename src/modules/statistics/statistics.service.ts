import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsDto } from './dto/statistics.dto';
import {
  StatisticsResponseDto,
  TopUserDto,
} from './dto/statistics-response.dto';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectMetric('statistics_calculations_total')
    private readonly statsCounter: Counter<string>,
    @InjectMetric('statistics_calculation_duration_seconds')
    private readonly statsDuration: Histogram<string>,
  ) {}

  /**
   * Generate statistics for repositories
   */
  async generateStatistics(
    statsDto: StatisticsDto,
  ): Promise<StatisticsResponseDto> {
    const startTime = Date.now();
    const { user, topN = 5 } = statsDto;

    // Build filter based on user parameter
    const filter = user
      ? {
          user: {
            login: user,
          },
        }
      : {};

    // Execute parallel queries
    const [totalRepos, totalUsers, languageStats, topUsers, timelineData] =
      await Promise.all([
        // Count total repositories
        this.prisma.repository.count({ where: filter }),

        // Count total users (only for global stats)
        user ? Promise.resolve(null) : this.prisma.user.count(),

        // Group by language
        this.getLanguageStatistics(filter),

        // Top users by repository count (only for global stats)
        user ? Promise.resolve(null) : this.getTopUsers(topN),

        // Timeline by month
        this.getTimelineStatistics(filter),
      ]);

    // Build summary
    const summary: any = {
      total_repos: totalRepos,
    };

    if (!user && totalUsers !== null) {
      summary.total_users = totalUsers;
    }

    // Build response
    const response: StatisticsResponseDto = {
      summary,
      languages: languageStats,
      timeline_created_monthly: timelineData,
    };

    // Add top users only for global stats
    if (!user && topUsers) {
      response.top_users_by_repos = topUsers;
    }

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    this.statsCounter.inc({ username: user || 'global' });
    this.statsDuration.observe({ username: user || 'global' }, duration);

    return response;
  }

  /**
   * Get language statistics
   */
  private async getLanguageStatistics(
    filter: any,
  ): Promise<Record<string, number>> {
    const languageGroups = await this.prisma.repository.groupBy({
      by: ['language'],
      where: filter,
      _count: {
        language: true,
      },
    });

    const languages: Record<string, number> = {};

    for (const group of languageGroups) {
      const key = group.language || 'null';
      languages[key] = group._count.language;
    }

    return languages;
  }

  /**
   * Get top users by repository count
   */
  private async getTopUsers(topN: number): Promise<TopUserDto[]> {
    const userGroups = await this.prisma.repository.groupBy({
      by: ['userId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: topN,
    });

    // Fetch user details
    const userIds = userGroups.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        login: true,
      },
    });

    // Create a map for quick lookup
    const userMap = new Map(users.map((u) => [u.id, u.login]));

    // Build result
    return userGroups.map((group) => ({
      login: userMap.get(group.userId) || 'unknown',
      count: group._count.id,
    }));
  }

  /**
   * Get timeline statistics by month
   */
  private async getTimelineStatistics(
    filter: any,
  ): Promise<Record<string, number>> {
    // Get all repositories with their creation dates
    const repositories = await this.prisma.repository.findMany({
      where: filter,
      select: {
        createdAt: true,
      },
    });

    // Group by month
    const monthCounts: Record<string, number> = {};

    for (const repo of repositories) {
      const monthKey = this.formatYearMonth(repo.createdAt);
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }

    // Fill missing months if there are any repositories
    if (repositories.length > 0) {
      return this.fillMissingMonths(monthCounts);
    }

    return monthCounts;
  }

  /**
   * Format date as YYYY-MM
   */
  private formatYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Fill missing months in timeline
   */
  private fillMissingMonths(
    monthCounts: Record<string, number>,
  ): Record<string, number> {
    const months = Object.keys(monthCounts).sort();

    if (months.length === 0) {
      return monthCounts;
    }

    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];

    const [firstYear, firstMonthNum] = firstMonth.split('-').map(Number);
    const [lastYear, lastMonthNum] = lastMonth.split('-').map(Number);

    const result: Record<string, number> = {};

    let currentYear = firstYear;
    let currentMonth = firstMonthNum;

    while (
      currentYear < lastYear ||
      (currentYear === lastYear && currentMonth <= lastMonthNum)
    ) {
      const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      result[monthKey] = monthCounts[monthKey] || 0;

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    return result;
  }
}
