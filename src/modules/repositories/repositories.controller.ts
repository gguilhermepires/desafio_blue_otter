import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RepositoriesService } from './repositories.service';
import { SyncResponseDto } from './dto/sync-response.dto';
import { SyncAsyncResponseDto } from './dto/sync-async-response.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SearchDto } from './dto/search.dto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { SyncJobsService } from '../kafka/sync-jobs.service';

@ApiTags('repositories')
@Controller('api/repositories')
export class RepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly syncJobsService: SyncJobsService,
  ) {}

  @Post('sync/:username')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Sync GitHub repositories for a user (Async)',
    description:
      'Queues a job to fetch and store all public repositories for a GitHub user. Returns immediately with a job ID for status tracking.',
  })
  @ApiParam({
    name: 'username',
    description: 'GitHub username',
    example: 'octocat',
  })
  @ApiResponse({
    status: 202,
    description: 'Sync job queued successfully',
    type: SyncAsyncResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to queue sync job',
  })
  async syncRepositories(
    @Param('username') username: string,
  ): Promise<SyncAsyncResponseDto> {
    // Create sync job in database
    const syncJob = await this.syncJobsService.createSyncJob(username);

    // Publish sync request event to Kafka
    await this.kafkaProducer.publishSyncRequest({
      jobId: syncJob.jobId,
      username,
      timestamp: Date.now(),
    });

    return {
      jobId: syncJob.jobId,
      username: syncJob.username,
      status: syncJob.status.toLowerCase(),
      createdAt: syncJob.createdAt,
    };
  }

  @Get('sync/status/:jobId')
  @ApiOperation({
    summary: 'Get sync job status',
    description: 'Retrieves the current status of a repository sync job by its job ID.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async getSyncJobStatus(@Param('jobId') jobId: string) {
    const syncJob = await this.syncJobsService.getJobById(jobId);

    return {
      jobId: syncJob.jobId,
      username: syncJob.username,
      status: syncJob.status.toLowerCase(),
      repositoriesCount: syncJob.repositoriesCount,
      error: syncJob.error,
      createdAt: syncJob.createdAt,
      completedAt: syncJob.completedAt,
    };
  }

  @Get('list/:username')
  @ApiOperation({
    summary: 'List repositories for a user',
    description:
      'Returns paginated list of repositories for a user, ordered by creation date (newest first).',
  })
  @ApiParam({
    name: 'username',
    description: 'GitHub username',
    example: 'octocat',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Repositories retrieved successfully',
    type: ListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found in database',
  })
  async listRepositories(
    @Param('username') username: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<ListResponseDto> {
    return this.repositoriesService.listUserRepositories(
      username,
      paginationDto,
    );
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search repositories by keywords',
    description:
      'Searches repositories by keywords in name, description, and language fields. Supports multiple space-separated keywords with OR logic.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search keywords (space-separated)',
    example: 'react typescript',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search query',
  })
  async searchRepositories(
    @Query() searchDto: SearchDto,
  ): Promise<SearchResponseDto> {
    return this.repositoriesService.searchRepositories(searchDto);
  }
}
