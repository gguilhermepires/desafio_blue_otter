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
export declare class RepositoriesService {
    private readonly prisma;
    private readonly githubService;
    private readonly usersService;
    private readonly syncCounter;
    private readonly syncDuration;
    private readonly reposSyncedGauge;
    private readonly searchCounter;
    private readonly searchDuration;
    private readonly searchResultsGauge;
    private readonly logger;
    constructor(prisma: PrismaService, githubService: GithubService, usersService: UsersService, syncCounter: Counter<string>, syncDuration: Histogram<string>, reposSyncedGauge: Gauge<string>, searchCounter: Counter<string>, searchDuration: Histogram<string>, searchResultsGauge: Gauge<string>);
    syncUserRepositories(username: string): Promise<SyncResponseDto>;
    listUserRepositories(username: string, pagination: PaginationDto): Promise<ListResponseDto>;
    searchRepositories(searchDto: SearchDto): Promise<SearchResponseDto>;
    findById(id: number): Promise<Repository | null>;
    findByGithubId(githubId: number): Promise<Repository | null>;
}
