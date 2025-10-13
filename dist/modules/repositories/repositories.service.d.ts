import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { UsersService } from '../users/users.service';
import { SyncResponseDto } from './dto/sync-response.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SearchDto } from './dto/search.dto';
import { Repository } from '@prisma/client';
export declare class RepositoriesService {
    private readonly prisma;
    private readonly githubService;
    private readonly usersService;
    private readonly logger;
    constructor(prisma: PrismaService, githubService: GithubService, usersService: UsersService);
    syncUserRepositories(username: string): Promise<SyncResponseDto>;
    listUserRepositories(username: string, pagination: PaginationDto): Promise<ListResponseDto>;
    searchRepositories(searchDto: SearchDto): Promise<SearchResponseDto>;
    findById(id: number): Promise<Repository | null>;
    findByGithubId(githubId: number): Promise<Repository | null>;
}
