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
import { ListResponseDto } from './dto/list-response.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SearchDto } from './dto/search.dto';

@ApiTags('repositories')
@Controller('api/repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Post('sync/:username')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Sync GitHub repositories for a user',
    description:
      'Fetches and stores all public repositories for a GitHub user. Creates or updates user and repository records.',
  })
  @ApiParam({
    name: 'username',
    description: 'GitHub username',
    example: 'octocat',
  })
  @ApiResponse({
    status: 201,
    description: 'Repositories synced successfully',
    type: SyncResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'GitHub user not found',
  })
  @ApiResponse({
    status: 429,
    description: 'GitHub API rate limit exceeded',
  })
  @ApiResponse({
    status: 502,
    description: 'GitHub API request failed',
  })
  async syncRepositories(
    @Param('username') username: string,
  ): Promise<SyncResponseDto> {
    return this.repositoriesService.syncUserRepositories(username);
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
