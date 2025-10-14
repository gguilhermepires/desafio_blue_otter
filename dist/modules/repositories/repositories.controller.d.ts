import { RepositoriesService } from './repositories.service';
import { SyncAsyncResponseDto } from './dto/sync-async-response.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SearchDto } from './dto/search.dto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { SyncJobsService } from '../kafka/sync-jobs.service';
export declare class RepositoriesController {
    private readonly repositoriesService;
    private readonly kafkaProducer;
    private readonly syncJobsService;
    constructor(repositoriesService: RepositoriesService, kafkaProducer: KafkaProducerService, syncJobsService: SyncJobsService);
    syncRepositories(username: string): Promise<SyncAsyncResponseDto>;
    getSyncJobStatus(jobId: string): Promise<{
        jobId: string;
        username: string;
        status: string;
        repositoriesCount: number | null;
        error: string | null;
        createdAt: Date;
        completedAt: Date | null;
    }>;
    listRepositories(username: string, paginationDto: PaginationDto): Promise<ListResponseDto>;
    searchRepositories(searchDto: SearchDto): Promise<SearchResponseDto>;
}
