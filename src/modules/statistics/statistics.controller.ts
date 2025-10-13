import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { StatisticsDto } from './dto/statistics.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';

@ApiTags('statistics')
@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get repository statistics',
    description:
      'Calculate and return statistics about repositories. Can be filtered by user or return global statistics. Includes summary counts, language distribution, timeline, and top users.',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    description: 'Filter statistics by username',
    example: 'octocat',
  })
  @ApiQuery({
    name: 'topN',
    required: false,
    description: 'Number of top users to return (only for global statistics)',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics calculated successfully',
    type: StatisticsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  async getStatistics(
    @Query() statisticsDto: StatisticsDto,
  ): Promise<StatisticsResponseDto> {
    return this.statisticsService.generateStatistics(statisticsDto);
  }
}
