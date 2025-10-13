import { RepositoriesService } from './repositories.service';
import { SyncResponseDto } from './dto/sync-response.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SearchDto } from './dto/search.dto';
export declare class RepositoriesController {
    private readonly repositoriesService;
    constructor(repositoriesService: RepositoriesService);
    syncRepositories(username: string): Promise<SyncResponseDto>;
    listRepositories(username: string, paginationDto: PaginationDto): Promise<ListResponseDto>;
    searchRepositories(searchDto: SearchDto): Promise<SearchResponseDto>;
}
