import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SummaryDto {
  @ApiProperty({
    description: 'Total number of repositories',
    example: 1234,
  })
  total_repos: number;

  @ApiPropertyOptional({
    description: 'Total number of users (only for global statistics)',
    example: 42,
  })
  total_users?: number;
}

export class TopUserDto {
  @ApiProperty({
    description: 'User login',
    example: 'octocat',
  })
  login: string;

  @ApiProperty({
    description: 'Number of repositories',
    example: 125,
  })
  count: number;
}

export class StatisticsResponseDto {
  @ApiProperty({
    description: 'Summary statistics',
    type: SummaryDto,
  })
  summary: SummaryDto;

  @ApiProperty({
    description: 'Repository count by programming language',
    example: {
      TypeScript: 45,
      JavaScript: 32,
      Python: 28,
      Go: 15,
      null: 5,
    },
  })
  languages: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Top users by repository count (only for global statistics)',
    type: [TopUserDto],
  })
  top_users_by_repos?: TopUserDto[];

  @ApiProperty({
    description: 'Timeline of repository creation by month',
    example: {
      '2025-01': 12,
      '2025-02': 18,
      '2025-03': 15,
    },
  })
  timeline_created_monthly: Record<string, number>;
}
