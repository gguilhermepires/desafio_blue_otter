import { StatisticsService } from './statistics.service';
import { StatisticsDto } from './dto/statistics.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
export declare class StatisticsController {
    private readonly statisticsService;
    constructor(statisticsService: StatisticsService);
    getStatistics(statisticsDto: StatisticsDto): Promise<StatisticsResponseDto>;
}
